from __future__ import annotations
import json
import logging
import re
import time
import unicodedata
from datetime import datetime
from typing import Any, Literal
from interview_ai.base import Intelligence
from interview_ai.cv import CVRAGStore
from interview_ai.prompts import detect_response_language, normalize_cv_profile
from orchestrator.rh_schemas import RHAgentOutput
from orchestrator.rh_state import PhaseType, RHSessionState
from orchestrator.session_store import JsonSessionStore, SessionStore
from vision.emotion import build_visual_llm_context, empty_visual_observations
from voice.observations import build_audio_llm_context, empty_audio_observations

logger = logging.getLogger(__name__)

FALLBACK_RETRY_MESSAGE = "Desole, une erreur est survenue. Pouvez-vous repeter votre reponse ?"
FINAL_MESSAGES = {
    "fr": "Merci pour vos reponses. L'entretien est maintenant termine. Je vais finaliser votre rapport .",
    "en": "Thank you for your answers. The interview is now complete. I will finalize your report.",
}
COMPETENCY_LABELS = {
    "fr": {
        "communication": "Communication",
        "teamwork": "Travail en equipe",
        "problem_solving": "Resolution de problemes",
        "motivation": "Motivation",
    },
    "en": {
        "communication": "Communication",
        "teamwork": "Teamwork",
        "problem_solving": "Problem solving",
        "motivation": "Motivation",
    },
}
CLARIFICATION_MARKERS = (
    "je n'ai pas compris",
    "j'ai pas compris",
    "je n ai pas compris",
    "je n'ai pas bien compris",
    "pas compris",
    "pouvez-vous reformuler",
    "pouvez vous reformuler",
    "peux-tu reformuler",
    "peux tu reformuler",
    "reformulez",
    "reformuler",
    "plus simple",
    "repetez la question",
    "repete la question",
    "can you rephrase",
    "i did not understand",
    "i didn't understand",
)
ALLOWED_INPUT_MODES = {"text", "voice", "mixed"}


def utc_now_iso() -> str:
    return datetime.utcnow().isoformat()


def empty_skills() -> dict[str, dict[str, Any]]:
    return {
        "communication": {"level": 0, "evidence": ""},
        "teamwork": {"level": 0, "evidence": ""},
        "problem_solving": {"level": 0, "evidence": ""},
        "motivation": {"level": 0, "evidence": ""},
    }


def empty_scores() -> dict[str, int]:
    return {
        "communication": 0,
        "teamwork": 0,
        "problem_solving": 0,
        "motivation": 0,
    }


def has_meaningful_score(score: dict[str, int] | None) -> bool:
    if not isinstance(score, dict):
        return False
    return any(int(score.get(key, 0)) > 0 for key in score)


def normalize_score_partial(value: Any) -> dict[str, int]:
    if hasattr(value, "keys"):
        return dict(value)
    return empty_scores()


def final_notes(lang: Literal["fr", "en"]) -> list[str]:
    return ["Entretien termine"] if lang == "fr" else ["Interview complete"]


def final_message(lang: Literal["fr", "en"]) -> str:
    return FINAL_MESSAGES[lang]


def normalize_matching_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", " ".join((text or "").split()).lower())
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("â€™", "'").replace("`", "'")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def is_clarification_request(text: str) -> bool:
    lowered = normalize_matching_text(text)
    if not lowered:
        return False
    return any(marker in lowered for marker in CLARIFICATION_MARKERS)


def label_competency(key: str, response_language: Literal["fr", "en"] = "fr") -> str:
    labels = COMPETENCY_LABELS.get(response_language, COMPETENCY_LABELS["fr"])
    return labels.get(key, key.replace("_", " ").title())


def build_strengths(
    competencies: dict[str, int],
    cv_profile: dict[str, Any],
    response_language: Literal["fr", "en"] = "fr",
) -> list[str]:
    strengths = [
        (
            f"{label_competency(key, response_language)} strong ({value}/5)"
            if response_language == "en"
            else f"{label_competency(key, response_language)} solide ({value}/5)"
        )
        for key, value in competencies.items()
        if value >= 4
    ]
    if strengths:
        return strengths[:3]

    ranked = sorted(competencies.items(), key=lambda item: (-item[1], item[0]))
    fallback = [
        (
            f"{label_competency(key, response_language)} solid ({value}/5)"
            if response_language == "en"
            else f"{label_competency(key, response_language)} correcte ({value}/5)"
        )
        for key, value in ranked
        if value > 0
    ][:2]

    top_skills = [str(item).strip() for item in (cv_profile.get("top_skills") or []) if str(item).strip()]
    if top_skills:
        fallback.append(
            f"Technical base visible in {', '.join(top_skills[:3])}"
            if response_language == "en"
            else f"Base technique visible sur {', '.join(top_skills[:3])}"
        )
    return fallback[:3]


def build_improvement_points(
    competencies: dict[str, int],
    response_language: Literal["fr", "en"] = "fr",
) -> list[str]:
    improvement = [
        (
            f"{label_competency(key, response_language)} to deepen ({value}/5)"
            if response_language == "en"
            else f"{label_competency(key, response_language)} a approfondir ({value}/5)"
        )
        for key, value in competencies.items()
        if value and value <= 2
    ]
    if improvement:
        return improvement[:3]

    ranked = sorted(competencies.items(), key=lambda item: (item[1], item[0]))
    fallback = [
        (
            f"Strengthen {label_competency(key, response_language).lower()} to increase impact"
            if response_language == "en"
            else f"Renforcer {label_competency(key, response_language).lower()} pour gagner en impact"
        )
        for key, value in ranked[:2]
        if value > 0
    ]
    return fallback[:3]


def report_needs_llm_regeneration(report: Any) -> bool:
    if not isinstance(report, dict):
        return True
    try:
        schema_version = int(report.get("report_schema_version") or 0)
    except Exception:
        schema_version = 0
    if report.get("generated_by") != "llm" or schema_version < 3:
        return True

    required_dimension_keys = {"communication", "teamwork", "problem_solving", "motivation"}
    for field_name in ("dimension_signals", "dimension_actions"):
        value = report.get(field_name)
        if not isinstance(value, dict):
            return True
        if required_dimension_keys - {str(key) for key in value.keys()}:
            return True
        if any(not str(value.get(key, "") or "").strip() for key in required_dimension_keys):
            return True

    texts: list[str] = []
    for key in ("strengths", "improvement_points", "advice"):
        value = report.get(key)
        if isinstance(value, list):
            texts.extend(str(item).strip() for item in value if str(item).strip())
    summary = str(report.get("summary", "") or "").strip()
    if summary:
        texts.append(summary)

    if not texts:
        return True

    english_fragments = (
        "react expertise",
        "full stack delivery",
        "team collaboration",
        "communication clarity",
        "problem solving depth",
        "motivation articulation",
    )
    for text in texts:
        normalized = normalize_matching_text(text).strip(" .")
        word_count = len(re.findall(r"\b[\w'-]+\b", normalized, flags=re.UNICODE))
        if normalized in english_fragments:
            return True
        if word_count < 5:
            return True

    return False


def merge_scores(turns: list[dict[str, Any]]) -> dict[str, int]:
    collected: dict[str, list[int]] = {key: [] for key in empty_scores()}

    for turn in turns:
        score = turn.get("score_partial", {})
        if not isinstance(score, dict):
            continue
        for key in collected:
            try:
                value = int(score.get(key, 0))
                if 0 < value <= 5:
                    collected[key].append(value)
            except Exception:
                continue

    merged: dict[str, int] = {}
    for key, values in collected.items():
        merged[key] = round(sum(values) / len(values)) if values else 0
    return merged


def combine_competency_scores(*sources: dict[str, int] | None) -> dict[str, int]:
    combined: dict[str, int] = {}
    for key in empty_scores():
        values: list[int] = []
        for source in sources:
            if not isinstance(source, dict):
                continue
            try:
                value = int(source.get(key, 0))
            except Exception:
                value = 0
            if value > 0:
                values.append(max(0, min(5, value)))
        combined[key] = round(sum(values) / len(values)) if values else 0
    return combined


class RHWorkflowSupport:
    """Shared RH workflow runtime reused by both Python and LangGraph orchestrators."""

    PHASE_SEQUENCE: tuple[PhaseType, ...] = ("INTRO", "BEHAVIOR", "SOFT", "MOTIVATION", "FINAL")

    @staticmethod
    def _report_needs_llm_regeneration(report: Any) -> bool:
        return report_needs_llm_regeneration(report)

    def __init__(
        self,
        intelligence: Intelligence,
        tts,
        session_store: SessionStore | None = None,
        cv_rag_store: CVRAGStore | None = None,
        cv_blob_storage: Any | None = None,
    ):
        self.intelligence = intelligence
        self.tts = tts
        self.session_store = session_store or JsonSessionStore()
        self.cv_rag_store = cv_rag_store or CVRAGStore()
        self.cv_blob_storage = cv_blob_storage
        self.sessions: dict[str, RHSessionState] = {}

    @staticmethod
    def _normalize_input_mode(value: str | None) -> Literal["text", "voice", "mixed"]:
        normalized = str(value or "").strip().lower()
        if normalized in ALLOWED_INPUT_MODES:
            return normalized  # type: ignore[return-value]
        return "mixed"

    @staticmethod
    def _build_insights_cache_key(
        *,
        visual_observations: dict[str, Any],
        audio_observations: dict[str, Any],
        response_language: str,
    ) -> str:
        payload = {
            "response_language": str(response_language or "fr").strip().lower() or "fr",
            "visual_observations": visual_observations or {},
            "audio_observations": audio_observations or {},
        }
        return json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":"))

    @staticmethod
    def _clear_cached_insights(session: RHSessionState) -> None:
        session.cached_insights = {}

    def _build_llm_session_state(
        self,
        session: RHSessionState,
        *,
        text: str,
        current_phase: PhaseType,
        rag_context: list[str],
    ) -> dict[str, Any]:
        return {
            "last_question_index": session.last_question_index,
            "interview_max_questions": session.interview_max_questions,
            "questions_asked": len(session.turns),
            "remaining_questions": max(0, session.interview_max_questions - len(session.turns)),
            "phase": current_phase,
            "final_report_exists": False,
            "cv_profile": session.cv_profile,
            "cv_context": rag_context,
            "recent_turns": session.turns[-4:],
            "response_language": self._resolve_language(session, text),
        }

    def _retrieve_rag_context(
        self,
        *,
        session_id: str,
        query: str,
        top_k: int = 2,
    ) -> tuple[list[str], float]:
        started_at = time.perf_counter()
        rag_context = self.cv_rag_store.retrieve_context(
            session_id=session_id,
            query=query,
            top_k=top_k,
        )
        return rag_context, (time.perf_counter() - started_at) * 1000

    def _fallback_output(
        self,
        *,
        phase: PhaseType,
        question_index: int,
        notes: list[str],
        say: str = FALLBACK_RETRY_MESSAGE,
    ) -> RHAgentOutput:
        return RHAgentOutput(
            say=say,
            phase=phase,
            question_index=question_index,
            skills=empty_skills(),
            score_partial=empty_scores(),
            notes=notes,
        )

    def _validate_generated_output(
        self,
        *,
        raw_result: Any,
        current_phase: PhaseType,
        question_index: int,
        log_label: str,
    ) -> RHAgentOutput:
        try:
            output = RHAgentOutput.model_validate(raw_result)
        except Exception as exc:
            suffix = f" {log_label}" if log_label else ""
            logger.error("Echec validation RHAgentOutput%s", suffix, exc_info=exc)
            output = self._fallback_output(
                phase=current_phase,
                question_index=question_index,
                notes=["Erreur de parsing LLM"],
            )

        if output.phase != current_phase and output.phase != "FINAL":
            output = output.model_copy(update={"phase": current_phase})
        return output

    def _get_or_create_session(self, session_id: str) -> RHSessionState:
        if session_id in self.sessions:
            return self.sessions[session_id]

        loaded = self.session_store.load(session_id)
        if loaded:
            state = RHSessionState(
                session_id=session_id,
                interview_max_questions=int(loaded.get("interview_max_questions", 4)),
                last_question_index=int(loaded.get("last_question_index", 0)),
                turns=loaded.get("turns", []) if isinstance(loaded.get("turns"), list) else [],
                final_report=loaded.get("final_report") if isinstance(loaded.get("final_report"), dict) else None,
                cv_profile=normalize_cv_profile(loaded.get("cv_profile", {})),
                cv_uploaded=bool(loaded.get("cv_uploaded", False)),
                response_language=str(loaded.get("response_language", "")).strip().lower(),
                visual_observations=loaded.get("visual_observations", {})
                if isinstance(loaded.get("visual_observations"), dict)
                else empty_visual_observations(),
                audio_observations=loaded.get("audio_observations", {})
                if isinstance(loaded.get("audio_observations"), dict)
                else empty_audio_observations(),
                proctoring_events=loaded.get("proctoring_events", [])
                if isinstance(loaded.get("proctoring_events"), list)
                else [],
                interview_status=str(loaded.get("interview_status", "") or "").strip().lower() or "draft",
                finalized_at=str(loaded.get("finalized_at", "") or "").strip(),
                finalized_by=str(loaded.get("finalized_by", "") or "").strip(),
                preferred_input_mode=self._normalize_input_mode(loaded.get("preferred_input_mode")),
                cached_insights=loaded.get("cached_insights", {})
                if isinstance(loaded.get("cached_insights"), dict)
                else {},
            )
        else:
            state = RHSessionState(session_id=session_id)
            profile = self.cv_rag_store.get_profile(session_id)
            normalized_profile = normalize_cv_profile(profile)
            if normalized_profile:
                state.cv_profile = normalized_profile
                state.cv_uploaded = True
        if state.interview_status not in {"draft", "active", "finalized"}:
            state.interview_status = "draft"
        if state.final_report and state.interview_status != "finalized":
            state.interview_status = "finalized"
        elif state.turns and state.interview_status == "draft":
            state.interview_status = "active"

        self.sessions[session_id] = state
        return state

    def _persist_session(self, session: RHSessionState) -> None:
        try:
            self.session_store.save(session.session_id, session.__dict__)
        except Exception as exc:
            logger.exception("Echec persistance session %s", session.session_id, exc_info=exc)

    def _current_phase(self, session: RHSessionState) -> PhaseType:
        asked = len(session.turns)
        if asked >= len(self.PHASE_SEQUENCE) - 1:
            return "FINAL"
        return self.PHASE_SEQUENCE[asked]

    def _resolve_language(self, session: RHSessionState, latest_text: str = "") -> Literal["fr", "en"]:
        if latest_text.strip():
            lang = detect_response_language(latest_text)
            if lang in {"fr", "en"}:
                session.response_language = lang
                return lang

        if session.response_language in {"fr", "en"}:
            return session.response_language

        for turn in reversed(session.turns):
            text = str(turn.get("candidate_text", "")).strip()
            if text:
                lang = detect_response_language(text)
                if lang in {"fr", "en"}:
                    session.response_language = lang
                    return lang

        return "fr"

    def get_cached_insights(
        self,
        session_id: str,
        *,
        response_language: str,
    ) -> dict[str, Any] | None:
        session = self._get_or_create_session(session_id)
        cached = session.cached_insights if isinstance(session.cached_insights, dict) else {}
        cache_key = self._build_insights_cache_key(
            visual_observations=session.visual_observations,
            audio_observations=session.audio_observations,
            response_language=response_language,
        )
        if str(cached.get("cache_key", "") or "") != cache_key:
            return None
        return cached

    def store_cached_insights(
        self,
        session_id: str,
        *,
        response_language: str,
        visual_context: dict[str, Any],
        audio_context: dict[str, Any],
        stress_context: dict[str, Any],
        insights_advice: dict[str, Any] | None,
    ) -> dict[str, Any]:
        session = self._get_or_create_session(session_id)
        session.cached_insights = {
            "cache_key": self._build_insights_cache_key(
                visual_observations=session.visual_observations,
                audio_observations=session.audio_observations,
                response_language=response_language,
            ),
            "response_language": response_language,
            "visual_context": dict(visual_context or {}),
            "audio_context": dict(audio_context or {}),
            "stress_context": dict(stress_context or {}),
            "insights_advice": dict(insights_advice or {}) if isinstance(insights_advice, dict) else None,
            "updated_at": utc_now_iso(),
        }
        self._persist_session(session)
        return session.cached_insights

    def set_preferred_input_mode(self, session_id: str, input_mode: str | None) -> RHSessionState:
        session = self._get_or_create_session(session_id)
        session.preferred_input_mode = self._normalize_input_mode(input_mode)
        self._persist_session(session)
        return session

    def _final_message(self, lang: Literal["fr", "en"]) -> str:
        return final_message(lang)

    def _build_rephrase_output(
        self,
        session: RHSessionState,
        *,
        text: str,
        candidate_name: str,
    ) -> RHAgentOutput | None:
        if not session.turns:
            return None

        last_turn = session.turns[-1]
        original_question = str(last_turn.get("say", "")).strip()
        original_phase = str(last_turn.get("phase", "")).upper()
        if not original_question or original_phase not in self.PHASE_SEQUENCE:
            return None

        question_index = max(1, int(last_turn.get("question_index", session.last_question_index or 1)))
        rag_context, _ = self._retrieve_rag_context(
            session_id=session.session_id,
            query=original_question,
            top_k=2,
        )
        result = self.intelligence.generate(
            text=text,
            candidate_name=candidate_name,
            session_id=session.session_id,
            session_state={
                "last_question_index": max(0, question_index - 1),
                "phase": original_phase,
                "cv_profile": session.cv_profile,
                "cv_context": rag_context,
                "recent_turns": session.turns[-4:],
                "response_language": self._resolve_language(session, text),
                "rephrase_only": True,
                "question_to_rephrase": original_question,
                "rephrase_question_index": question_index,
            },
        )
        try:
            output = RHAgentOutput.model_validate(result)
        except Exception as exc:
            logger.warning("Echec validation reformulation", exc_info=exc)
            output = self._fallback_output(
                say=original_question,
                phase=original_phase,
                question_index=question_index,
                notes=["Reformulation"],
            )

        if output.say:
            self.tts.speak(output.say)
        return output

    def _build_final_report(
        self,
        session: RHSessionState,
        latest_scores: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        response_language = self._resolve_language(session)
        merged_scores = merge_scores(session.turns)
        inferred_scores: dict[str, int] | None = None
        try:
            inferred = self.intelligence.infer_competencies_from_interview(
                cv_profile=session.cv_profile,
                turns=session.turns,
                response_language=response_language,
            )
            if has_meaningful_score(inferred):
                inferred_scores = inferred
        except Exception as exc:
            logger.warning("Echec inference competences", exc_info=exc)

        competencies = combine_competency_scores(
            latest_scores if has_meaningful_score(latest_scores) else None,
            merged_scores,
            inferred_scores,
        )

        total = sum(competencies.get(key, 0) for key in competencies)
        global_score = round((total / (max(1, len(competencies)) * 5)) * 100)

        strengths = build_strengths(competencies, session.cv_profile, response_language)
        weaknesses = build_improvement_points(competencies, response_language)
        visual_context = build_visual_llm_context(session.visual_observations, response_language)
        audio_context = build_audio_llm_context(session.audio_observations, response_language)

        report_generated_by = "llm"
        try:
            report_text = self.intelligence.generate_final_report_text(
                competencies=competencies,
                strengths=strengths,
                improvement_points=weaknesses,
                visual_context=visual_context,
                audio_context=audio_context,
                cv_profile=session.cv_profile,
                turns=session.turns,
                response_language=response_language,
            )
        except Exception:
            report_generated_by = "fallback"
            report_text = {"summary": "", "recommendations": [], "advice": [], "dimension_actions": {}}

        llm_strengths = [str(item).strip() for item in (report_text.get("strengths") or []) if str(item).strip()]
        llm_improvement_points = [
            str(item).strip()
            for item in (report_text.get("improvement_points") or [])
            if str(item).strip()
        ]
        dimension_actions = dict(report_text.get("dimension_actions") or {}) if isinstance(report_text.get("dimension_actions"), dict) else {}
        dimension_signals = dict(report_text.get("dimension_signals") or {}) if isinstance(report_text.get("dimension_signals"), dict) else {}
        recommendations = [str(item).strip() for item in (report_text.get("recommendations") or []) if str(item).strip()]
        advice = [str(item).strip() for item in (report_text.get("advice") or []) if str(item).strip()]
        summary = str(report_text.get("summary", "") or "").strip()

        return {
            "generated_by": report_generated_by,
            "report_schema_version": 3,
            "score_total": global_score,
            "competencies": competencies,
            "strengths": llm_strengths[:3] or strengths,
            "improvement_points": llm_improvement_points[:3] or weaknesses,
            "dimension_signals": dimension_signals,
            "dimension_actions": dimension_actions,
            "risks": [],
            "visual_signals": visual_context.get("signals", []),
            "visual_flags": visual_context.get("heuristic_flags", []),
            "visual_metrics": visual_context.get("metrics", {}),
            "confidence_note": str(visual_context.get("confidence_note", "") or ""),
            "audio_signals": audio_context.get("signals", []),
            "audio_flags": audio_context.get("heuristic_flags", []),
            "audio_metrics": audio_context.get("metrics", {}),
            "audio_confidence_note": str(audio_context.get("confidence_note", "") or ""),
            "proctoring_events": session.proctoring_events,
            "proctoring_alerts_count": len(session.proctoring_events),
            "recommendations": recommendations,
            "advice": advice,
            "summary": summary,
        }

    def _sync_final_report_observation_fields(self, session: RHSessionState) -> None:
        if not isinstance(session.final_report, dict):
            return
        response_language = self._resolve_language(session)
        visual_context = build_visual_llm_context(session.visual_observations, response_language)
        audio_context = build_audio_llm_context(session.audio_observations, response_language)
        session.final_report.update(
            {
                "visual_signals": visual_context.get("signals", []),
                "visual_flags": visual_context.get("heuristic_flags", []),
                "visual_metrics": visual_context.get("metrics", {}),
                "confidence_note": str(visual_context.get("confidence_note", "") or ""),
                "audio_signals": audio_context.get("signals", []),
                "audio_flags": audio_context.get("heuristic_flags", []),
                "audio_metrics": audio_context.get("metrics", {}),
                "audio_confidence_note": str(audio_context.get("confidence_note", "") or ""),
                "proctoring_events": session.proctoring_events,
                "proctoring_alerts_count": len(session.proctoring_events),
            }
        )

    def _ensure_final_report(
        self,
        session: RHSessionState,
        latest_scores: dict[str, int] | None = None,
    ) -> dict[str, Any]:
        if session.final_report is None or report_needs_llm_regeneration(session.final_report):
            session.final_report = self._build_final_report(session, latest_scores)
        else:
            self._sync_final_report_observation_fields(session)
        return session.final_report

    def _build_final_agent_output(
        self,
        session: RHSessionState,
        *,
        lang: Literal["fr", "en"],
    ) -> RHAgentOutput:
        return RHAgentOutput(
            say=self._final_message(lang),
            phase="FINAL",
            question_index=max(1, session.last_question_index),
            notes=final_notes(lang),
            skills=empty_skills(),
            score_partial=empty_scores(),
            final_report=session.final_report,
        )

    def _save_turn(self, session: RHSessionState, candidate_text: str, output: RHAgentOutput) -> None:
        turn = {
            "time": utc_now_iso(),
            "candidate_text": candidate_text.strip(),
            "phase": output.phase,
            "question_index": output.question_index,
            "say": output.say,
            "score_partial": normalize_score_partial(output.score_partial),
        }
        session.turns.append(turn)
        session.last_question_index = max(session.last_question_index, output.question_index)
        self._clear_cached_insights(session)
        if output.phase == "FINAL":
            session.interview_status = "finalized"
            if not session.finalized_at:
                session.finalized_at = str(turn["time"])
        else:
            session.interview_status = "active"
        self._persist_session(session)

    def _finalize_interview(
        self,
        session: RHSessionState,
        last_text: str,
        latest_scores: dict[str, int] | None = None,
    ) -> RHAgentOutput:
        lang = self._resolve_language(session, last_text)
        self._ensure_final_report(session, latest_scores)
        output = self._build_final_agent_output(session, lang=lang)

        self._save_turn(session, last_text, output)
        self.tts.speak(output.say)
        self._persist_session(session)
        return output

    def _build_final_output(self, session: RHSessionState) -> RHAgentOutput:
        lang = self._resolve_language(session)
        return RHAgentOutput(
            say=session.final_report.get("summary", self._final_message(lang))
            if session.final_report
            else self._final_message(lang),
            phase="FINAL",
            question_index=max(1, session.last_question_index),
            notes=final_notes(lang),
            skills=empty_skills(),
            score_partial=empty_scores(),
            final_report=session.final_report,
        )

    def ingest_candidate_cv(self, session_id: str, filename: str, raw_bytes: bytes) -> dict[str, Any]:
        session = self._get_or_create_session(session_id)
        result = self.cv_rag_store.ingest_cv(session_id, filename, raw_bytes)
        if self.cv_blob_storage is not None:
            try:
                blob = self.cv_blob_storage.upload_cv(
                    session_id=session_id,
                    filename=filename,
                    raw_bytes=raw_bytes,
                    content_type="application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream",
                )
                result["blob_storage"] = {
                    "container": blob.container,
                    "blob_name": blob.blob_name,
                    "url": blob.url,
                }
            except Exception as exc:
                logger.warning("Azure Blob CV upload skipped session=%s file=%s error=%s", session_id, filename, exc)
                result["blob_storage_error"] = str(exc)
        profile = normalize_cv_profile(result.get("profile", {}))
        if profile:
            session.cv_profile = profile
            session.cv_uploaded = True
            result["profile"] = profile
        self._persist_session(session)
        return result

    def record_visual_observations(self, session_id: str, visual_observations: dict[str, Any]) -> dict[str, Any]:
        session = self._get_or_create_session(session_id)
        session.visual_observations = dict(visual_observations or {})
        self._clear_cached_insights(session)
        self._sync_final_report_observation_fields(session)
        self._persist_session(session)
        return session.visual_observations

    def record_audio_observations(self, session_id: str, audio_observations: dict[str, Any]) -> dict[str, Any]:
        session = self._get_or_create_session(session_id)
        session.audio_observations = dict(audio_observations or {})
        self._clear_cached_insights(session)
        self._sync_final_report_observation_fields(session)
        self._persist_session(session)
        return session.audio_observations

    def record_proctoring_event(self, session_id: str, event: dict[str, Any]) -> dict[str, Any]:
        session = self._get_or_create_session(session_id)
        clean_event = dict(event or {})
        clean_event["time"] = str(clean_event.get("time") or utc_now_iso())
        clean_event["type"] = str(clean_event.get("type") or "").strip()[:80]
        clean_event["reason"] = str(clean_event.get("reason") or clean_event.get("type") or "Alerte surveillance").strip()[:120]
        clean_event["message"] = str(clean_event.get("message") or clean_event["reason"]).strip()[:240]
        details = clean_event.get("details")
        clean_event["details"] = details if isinstance(details, dict) else {}

        session.proctoring_events.append(clean_event)
        session.proctoring_events = session.proctoring_events[-500:]
        self._sync_final_report_observation_fields(session)
        self._persist_session(session)
        return {
            "events": session.proctoring_events,
            "count": len(session.proctoring_events),
            "latest": clean_event,
        }

    def finalize_session(
        self,
        session_id: str,
        *,
        finalized_by: str = "user",
        preferred_input_mode: str | None = None,
    ) -> RHAgentOutput:
        session = self._get_or_create_session(session_id)
        if preferred_input_mode is not None:
            session.preferred_input_mode = self._normalize_input_mode(preferred_input_mode)

        if session.final_report is None:
            self._ensure_final_report(session)

        output = self._build_final_agent_output(session, lang=self._resolve_language(session))
        last_turn = session.turns[-1] if session.turns else {}
        last_phase = str(last_turn.get("phase", "") or "").strip().upper() if isinstance(last_turn, dict) else ""
        if last_phase != "FINAL":
            self._save_turn(session, "", output)

        session.interview_status = "finalized"
        session.finalized_by = str(finalized_by or "user").strip() or "user"
        if not session.finalized_at:
            session.finalized_at = utc_now_iso()
        self._persist_session(session)
        return output
