from __future__ import annotations

import logging
import time
from typing import Any

from openai import APIConnectionError

from interview_ai.base import Intelligence, LLMRateLimitError
from interview_ai.constants import MAX_EVIDENCE_CHARS, MAX_NOTES, SKILL_KEYS, VALID_PHASES
from interview_ai.payloads import normalize_llm_payload
from interview_ai.prompts import (
    build_generation_messages,
    build_rephrase_messages,
    build_repair_instruction,
    detect_response_language,
)
from interview_ai.scoring import infer_competencies_from_interview as infer_scores_payload
from interview_ai.scoring import score_interview_turn as score_turn_payload
from interview_ai.validation import validate_candidate_question
from reporting.insights_builder import generate_insights_advice_text as generate_insights_advice_payload
from reporting.report_builder import generate_final_report_text as generate_report_payload

logger = logging.getLogger(__name__)


class StructuredInterviewIntelligence(Intelligence):
    """Shared RH interview intelligence pipeline for structured LLM transports."""

    DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
    DEFAULT_MODEL = "openai/gpt-oss-20b"
    VALID_PHASES = VALID_PHASES
    SKILL_KEYS = SKILL_KEYS
    MAX_EVIDENCE_CHARS = MAX_EVIDENCE_CHARS
    MAX_NOTES = MAX_NOTES

    @classmethod
    def resolve_transport_config(
        cls,
        *,
        base_url: str,
        model: str,
    ) -> tuple[str, str]:
        resolved_base_url = (base_url or cls.DEFAULT_BASE_URL).strip().rstrip("/")
        resolved_model = (model or cls.DEFAULT_MODEL).strip()
        return resolved_base_url, resolved_model

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        transport: Any,
        provider_name: str,
        temperature: float = 0.6,
        max_tokens: int = 900,
        base_url: str = "",
    ) -> None:
        resolved_api_key = (api_key or "").strip()
        if not resolved_api_key:
            raise RuntimeError("LLM_API_KEY missing in configuration")

        self.api_key = resolved_api_key
        self.base_url = (base_url or "").strip().rstrip("/")
        self.model = (model or "openai/gpt-oss-20b").strip()
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.provider_name = (provider_name or "llm").strip().lower()
        self.transport = transport

    def _resolve_temperature(self, phase: str, override: float | None = None) -> float:
        temp = override if override is not None else self.temperature
        if phase == "FINAL":
            return 0.15
        if phase in ("MOTIVATION", "SOFT"):
            return 0.35
        return temp

    def _request_json(
        self,
        *,
        messages: list[dict[str, str]],
        max_tokens: int,
        temperature: float,
        log_mode: str,
        phase: str,
    ) -> dict[str, Any]:
        return self.transport.request_json(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            log_mode=log_mode,
            phase=phase,
        )

    def _call_model(
        self,
        messages: list[dict[str, str]],
        *,
        phase: str,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        return self._request_json(
            messages=messages,
            max_tokens=max(700, self.max_tokens),
            temperature=self._resolve_temperature(phase, temperature),
            log_mode="prompt_json",
            phase=phase,
        )

    def _compute_retry_temperature(self, reason: str, base_retry_temp: float) -> float:
        if "repetee" in reason:
            return max(base_retry_temp, self.temperature + 0.1)
        if "trop technique" in reason:
            return max(base_retry_temp, self.temperature + 0.05)
        return max(base_retry_temp, self.temperature)

    def _normalize_competency_scores(self, value: Any) -> dict[str, int]:
        scores: dict[str, int] = {}
        raw = value if isinstance(value, dict) else {}
        for key in self.SKILL_KEYS:
            try:
                scores[key] = max(0, min(5, int(raw.get(key, 0))))
            except Exception:
                scores[key] = 0
        return scores

    def _empty_skills_payload(self) -> dict[str, dict[str, Any]]:
        return {
            key: {"level": 0, "evidence": ""}
            for key in self.SKILL_KEYS
        }

    def _empty_score_payload(self) -> dict[str, int]:
        return {key: 0 for key in self.SKILL_KEYS}

    def _build_rephrase_payload(
        self,
        *,
        session_id: str,
        candidate_name: str,
        phase: str,
        lang: str,
        text: str,
        question_to_rephrase: str,
        question_index: int,
        cv_profile: dict[str, Any],
        cv_context: list[str],
        recent_turns: list[dict[str, Any]],
    ) -> dict[str, Any]:
        messages = build_rephrase_messages(
            session_id=session_id,
            candidate_name=candidate_name,
            phase=phase,
            lang=lang,
            clarification_text=text,
            original_question=question_to_rephrase,
            question_index=question_index,
            recent_turns=recent_turns,
            cv_profile=cv_profile,
            rag_context=cv_context,
        )

        parsed = normalize_llm_payload(
            self._call_model(messages, phase=phase, temperature=0.2),
            phase,
            max(0, question_index - 1),
        )
        parsed["say"] = validate_candidate_question(
            question=str(parsed.get("say", "")).strip(),
            target_phase=phase,
            recent_turns=recent_turns[:-1] if recent_turns else [],
            cv_profile=cv_profile,
            rag_context=cv_context,
            current_text="",
        )
        parsed["phase"] = phase
        parsed["question_index"] = question_index
        parsed["skills"] = self._empty_skills_payload()
        parsed["score_partial"] = self._empty_score_payload()
        parsed["notes"] = ["reformulation"]
        parsed["final_report"] = None
        return parsed

    def _resolve_turn_scoring_context(
        self,
        *,
        text: str,
        phase: str,
        recent_turns: list[dict[str, Any]],
    ) -> tuple[str, str]:
        if not recent_turns:
            return "", "INTRO"

        last_turn = recent_turns[-1] if isinstance(recent_turns[-1], dict) else {}
        question = str(last_turn.get("say", "") or "").strip()
        question_phase = str(last_turn.get("phase", "") or phase).strip().upper() or phase
        if phase == "FINAL" and len(recent_turns) >= 1:
            question_phase = str(last_turn.get("phase", "") or "MOTIVATION").strip().upper() or "MOTIVATION"
        if not question and text:
            return "", question_phase
        return question, question_phase

    def _apply_turn_scoring(
        self,
        *,
        parsed: dict[str, Any],
        text: str,
        phase: str,
        lang: str,
        cv_profile: dict[str, Any],
        cv_context: list[str],
        recent_turns: list[dict[str, Any]],
    ) -> dict[str, Any]:
        question, question_phase = self._resolve_turn_scoring_context(
            text=text,
            phase=phase,
            recent_turns=recent_turns,
        )
        scoring_payload = self.score_interview_turn(
            cv_profile=cv_profile,
            recent_turns=recent_turns,
            question=question,
            answer=text,
            question_phase=question_phase,
            response_language=lang,
        )
        parsed["score_partial"] = self._normalize_competency_scores(scoring_payload.get("score_partial"))
        parsed["skills"] = scoring_payload.get("skills") if isinstance(scoring_payload.get("skills"), dict) else self._empty_skills_payload()
        return parsed

    def _build_phase_retry_messages(
        self,
        *,
        messages: list[dict[str, str]],
        phase: str,
        lang: str,
        reason: str,
        last_question: str,
    ) -> tuple[list[dict[str, str]], float]:
        instruction, base_retry_temp = build_repair_instruction(reason)
        retry_messages = messages + [
            {
                "role": "user",
                "content": (
                    f"Question rejetee: {last_question or '[vide]'}. "
                    f"Motif de rejet: {reason}. "
                    f"{instruction}"
                ),
            }
        ]

        if phase == "BEHAVIOR" and "behavior trop detaillee" in reason:
            retry_messages.append(
                {
                    "role": "user",
                    "content": (
                        "Consigne BEHAVIOR stricte : pars d'un projet ou d'une experience du CV. "
                        "Demande un defi, une difficulte, un probleme ou une situation concrete. "
                        "N'ecris pas une question centree sur API, Spring Boot, React, composant, endpoint ou repository."
                    ),
                }
            )
        if phase == "BEHAVIOR" and "behavior trop affirmative" in reason:
            retry_messages.append(
                {
                    "role": "user",
                    "content": (
                        "Consigne BEHAVIOR stricte : ne formule pas 'une situation ou vous avez du gerer...'. "
                        "Utilise une forme plus neutre et exploratoire, par exemple : "
                        "'Avez-vous un exemple concret de... ?' ou "
                        "'Sur l'un de vos projets, avez-vous deja ete confronte(e) a... ?'. "
                        "Exemple valide : 'Sur l'un de vos projets, avez-vous deja ete confronte(e) a un conflit d'opinion dans l'equipe ?'."
                    ),
                }
            )

        if phase == "INTRO" and "intro invalide" in reason:
            intro_retry_content = (
                "Consigne INTRO stricte : commence par une courte phrase de bienvenue ou de remerciement, "
                "puis pose une seule question large sur le parcours, "
                "le background ou ce qui motive la personne dans son travail. "
                "Utilise seulement le nom du candidat et le headline. "
                "Ne mentionne ni projet, ni entreprise, ni annees d'experience."
            )
            if lang == "en":
                intro_retry_content = (
                    "Strict INTRO instruction: start with a short welcome or thank-you sentence, "
                    "then ask one broad opening question about the candidate's "
                    "background or what motivates them in their work. "
                    "Use only the candidate's name and headline. "
                    "Do not mention a project, a company, an internship, or years of experience."
                )
            retry_messages.append({"role": "user", "content": intro_retry_content})

        return retry_messages, base_retry_temp

    def _validate_or_repair_question(
        self,
        *,
        parsed: dict[str, Any],
        messages: list[dict[str, str]],
        phase: str,
        lang: str,
        text: str,
        cv_profile: dict[str, Any],
        cv_context: list[str],
        recent_turns: list[dict[str, Any]],
        session_id: str,
        total_start: float,
        last_index: int,
    ) -> dict[str, Any]:
        last_reason = "invalide"

        for _ in range(3):
            try:
                candidate_question = str(parsed.get("say", "")).strip()
                parsed["say"] = validate_candidate_question(
                    question=candidate_question,
                    target_phase=phase,
                    recent_turns=recent_turns,
                    cv_profile=cv_profile,
                    rag_context=cv_context,
                    current_text=text,
                )
                logger.info(
                    "LLM generate session_id=%s phase=%s provider=%s total_ms=%.1f recent_turns=%d cv_context=%d",
                    session_id,
                    phase,
                    self.provider_name,
                    (time.perf_counter() - total_start) * 1000,
                    len(recent_turns),
                    len(cv_context),
                )
                return parsed
            except ValueError as exc:
                reason = str(exc).lower()
                last_reason = reason
                last_question = str(parsed.get("say", "")).strip()
                logger.warning(
                    "Question LLM rejetee session_id=%s phase=%s provider=%s reason=%s question=%s",
                    session_id,
                    phase,
                    self.provider_name,
                    reason,
                    last_question,
                )
                retry_messages, base_retry_temp = self._build_phase_retry_messages(
                    messages=messages,
                    phase=phase,
                    lang=lang,
                    reason=reason,
                    last_question=last_question,
                )
                parsed = normalize_llm_payload(
                    self._call_model(
                        retry_messages,
                        phase=phase,
                        temperature=self._compute_retry_temperature(reason, base_retry_temp),
                    ),
                    phase,
                    last_index,
                )

        raise RuntimeError(f"Question LLM invalide apres reparation ({phase}) : {last_reason}")

    def healthcheck(self) -> dict[str, Any]:
        return self.transport.healthcheck()

    def generate_final_report_text(
        self,
        *,
        competencies: dict[str, int],
        strengths: list[str],
        improvement_points: list[str],
        visual_context: dict[str, Any],
        audio_context: dict[str, Any],
        cv_profile: dict[str, Any],
        turns: list[dict[str, Any]],
        response_language: str = "fr",
    ) -> dict[str, Any]:
        return generate_report_payload(
            request_json=self._request_json,
            competencies=competencies,
            strengths=strengths,
            improvement_points=improvement_points,
            visual_context=visual_context,
            audio_context=audio_context,
            cv_profile=cv_profile,
            turns=turns,
            response_language=response_language,
        )

    def infer_competencies_from_interview(
        self,
        *,
        cv_profile: dict[str, Any],
        turns: list[dict[str, Any]],
        response_language: str = "fr",
    ) -> dict[str, int]:
        return infer_scores_payload(
            request_json=self._request_json,
            normalize_scores=self._normalize_competency_scores,
            cv_profile=cv_profile,
            turns=turns,
            response_language=response_language,
        )

    def score_interview_turn(
        self,
        *,
        cv_profile: dict[str, Any],
        recent_turns: list[dict[str, Any]],
        question: str,
        answer: str,
        question_phase: str,
        response_language: str = "fr",
    ) -> dict[str, Any]:
        return score_turn_payload(
            request_json=self._request_json,
            normalize_scores=self._normalize_competency_scores,
            cv_profile=cv_profile,
            recent_turns=recent_turns,
            question=question,
            answer=answer,
            question_phase=question_phase,
            response_language=response_language,
        )

    def generate_insights_advice(
        self,
        *,
        visual_context: dict[str, Any],
        audio_context: dict[str, Any],
        stress_context: dict[str, Any],
        response_language: str = "fr",
    ) -> dict[str, Any]:
        return generate_insights_advice_payload(
            request_json=self._request_json,
            visual_context=visual_context,
            audio_context=audio_context,
            stress_context=stress_context,
            response_language=response_language,
        )

    def generate(
        self,
        *,
        text: str,
        candidate_name: str,
        session_id: str,
        session_state: dict[str, Any],
    ) -> dict[str, Any]:
        total_start = time.perf_counter()
        cv_profile = session_state.get("cv_profile", {})
        recent_turns = session_state.get("recent_turns", [])
        cv_context = session_state.get("cv_context", [])
        last_index = int(session_state.get("last_question_index", 0))
        phase = str(session_state.get("phase", "BEHAVIOR")).upper()
        if phase not in self.VALID_PHASES:
            phase = "BEHAVIOR"
        lang = detect_response_language(text)

        if session_state.get("rephrase_only"):
            return self._build_rephrase_payload(
                session_id=session_id,
                candidate_name=candidate_name,
                phase=phase,
                lang=lang,
                text=text,
                question_to_rephrase=str(session_state.get("question_to_rephrase", "")).strip(),
                question_index=max(1, int(session_state.get("rephrase_question_index", last_index or 1))),
                cv_profile=cv_profile,
                cv_context=cv_context,
                recent_turns=recent_turns,
            )

        messages = build_generation_messages(
            session_id=session_id,
            candidate_name=candidate_name,
            phase=phase,
            lang=lang,
            text=text,
            recent_turns=recent_turns,
            cv_profile=cv_profile,
            rag_context=cv_context,
        )

        try:
            parsed = normalize_llm_payload(
                self._call_model(messages, phase=phase),
                phase,
                last_index,
            )

            if phase == "FINAL":
                parsed["say"] = ""
                return self._apply_turn_scoring(
                    parsed=parsed,
                    text=text,
                    phase=phase,
                    lang=lang,
                    cv_profile=cv_profile,
                    cv_context=cv_context,
                    recent_turns=recent_turns,
                )

            parsed = self._validate_or_repair_question(
                parsed=parsed,
                messages=messages,
                phase=phase,
                lang=lang,
                text=text,
                cv_profile=cv_profile,
                cv_context=cv_context,
                recent_turns=recent_turns,
                session_id=session_id,
                total_start=total_start,
                last_index=last_index,
            )
            return self._apply_turn_scoring(
                parsed=parsed,
                text=text,
                phase=phase,
                lang=lang,
                cv_profile=cv_profile,
                cv_context=cv_context,
                recent_turns=recent_turns,
            )
        except APIConnectionError as exc:
            logger.exception("Erreur lors de la generation", exc_info=exc)
            diag = self.healthcheck()
            server_error = diag.get("error", "erreur de connexion inconnue")
            provider_label = self.provider_name.title()
            raise RuntimeError(
                f"Serveur LLM indisponible via {provider_label} ({self.base_url}) ; modele configure: {self.model}. "
                f"Diagnostic: {server_error}. "
                "Verifiez que le service est accessible, que la cle API est valide et que le modele est disponible."
            ) from exc
        except LLMRateLimitError:
            raise
        except Exception as exc:
            logger.exception("Erreur lors de la generation", exc_info=exc)
            raise RuntimeError(
                f"Echec generation LLM via {self.provider_name} ({self.model}): {exc}"
            ) from exc
