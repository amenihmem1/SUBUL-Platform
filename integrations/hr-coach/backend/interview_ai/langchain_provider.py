from __future__ import annotations

from typing import Any

from interview_ai.langchain_json_client import LangChainJSONClient
from interview_ai.llm_provider import StructuredInterviewIntelligence
from interview_ai.langchain_tools import LangChainToolbox, build_langchain_toolbox


class LangChainIntelligence(StructuredInterviewIntelligence):
    """LangChain-backed intelligence reusing the current RH generation pipeline."""

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        temperature: float = 0.6,
        max_tokens: int = 900,
        base_url: str = "https://api.groq.com/openai/v1",
        api_version: str = "",
        provider: str = "openai_compatible",
    ):
        resolved_base_url, resolved_model = self.resolve_transport_config(
            base_url=base_url,
            model=model,
        )
        transport = LangChainJSONClient(
            api_key=api_key,
            base_url=resolved_base_url,
            model=resolved_model,
            default_temperature=temperature,
            max_tokens=max_tokens,
            api_version=api_version,
            provider=provider,
        )
        super().__init__(
            api_key=api_key,
            base_url=resolved_base_url,
            model=resolved_model,
            temperature=temperature,
            max_tokens=max_tokens,
            transport=transport,
            provider_name="langchain",
        )
        self.toolbox: LangChainToolbox = build_langchain_toolbox(
            request_json=self._request_json,
            normalize_scores=self._normalize_competency_scores,
        )

    @staticmethod
    def _append_context_line(
        enriched_context: list[str],
        label: str,
        value: str,
    ) -> None:
        cleaned = str(value or "").strip()
        if cleaned:
            enriched_context.append(f"{label}: {cleaned}")

    @staticmethod
    def _append_context_items(
        enriched_context: list[str],
        label: str,
        values: list[Any],
        *,
        limit: int,
        separator: str,
    ) -> None:
        cleaned = [str(item).strip() for item in values if str(item).strip()]
        if cleaned:
            enriched_context.append(f"{label}: {separator.join(cleaned[:limit])}")

    @staticmethod
    def _invoke_tool(tool: Any, payload: dict[str, Any]) -> dict[str, Any]:
        result = tool.invoke(payload)
        return result if isinstance(result, dict) else {}

    def _build_enriched_context(
        self,
        *,
        text: str,
        candidate_name: str,
        session_state: dict[str, Any],
    ) -> list[str]:
        cv_profile = session_state.get("cv_profile", {})
        rag_context = list(session_state.get("cv_context", []) or [])
        recent_turns = list(session_state.get("recent_turns", []) or [])
        phase = str(session_state.get("phase", "BEHAVIOR")).upper()

        context = self._invoke_tool(
            self.toolbox.context,
            {
                "candidate_name": candidate_name,
                "phase": phase,
                "current_text": text,
                "cv_profile": cv_profile,
                "rag_context": rag_context,
                "recent_turns": recent_turns,
                "session_id": str(session_state.get("session_id", "") or ""),
            },
        )
        relevance = self._invoke_tool(
            self.toolbox.cv_relevance,
            {
                "phase": phase,
                "current_text": text,
                "cv_profile": cv_profile,
                "rag_context": rag_context,
                "recent_turns": recent_turns,
                "session_id": str(session_state.get("session_id", "") or ""),
            },
        )
        history_guard = self._invoke_tool(
            self.toolbox.question_history_check,
            {
                "recent_turns": recent_turns,
                "proposed_question": "",
            },
        )
        phase_guard = self._invoke_tool(
            self.toolbox.phase_strategy,
            {
                "phase": phase,
                "current_text": text,
                "recent_turns": recent_turns,
                "cv_profile": cv_profile,
            },
        )

        enriched_context = [item for item in rag_context if str(item).strip()]
        cv_summary = str(context.get("cv_summary", "")).strip()
        history_preview = str(context.get("history_preview", "")).strip()

        if cv_summary:
            enriched_context.append(f"Memoire CV: {cv_summary}")
        if history_preview and history_preview != "Aucun historique":
            enriched_context.append(f"Memoire reponses: {history_preview}")

        self._append_context_line(enriched_context, "Point d'attention", context.get("focus_phrase", ""))
        self._append_context_items(
            enriched_context,
            "Faits cles candidat",
            context.get("candidate_facts", []),
            limit=6,
            separator=" | ",
        )
        self._append_context_items(
            enriched_context,
            "Ancres prioritaires",
            context.get("anchors", []),
            limit=5,
            separator=", ",
        )
        self._append_context_line(enriched_context, "Ancre recommandee", relevance.get("best_anchor", ""))
        self._append_context_line(enriched_context, "Conseil CV", relevance.get("grounding_advice", ""))
        self._append_context_line(enriched_context, "Conseil anti-repetition", history_guard.get("history_advice", ""))
        self._append_context_items(
            enriched_context,
            "Questions recentes",
            history_guard.get("recent_questions", []),
            limit=3,
            separator=" | ",
        )
        self._append_context_line(enriched_context, "Objectif de phase", phase_guard.get("goal", ""))
        self._append_context_line(enriched_context, "Style attendu", phase_guard.get("natural_style", ""))
        self._append_context_line(enriched_context, "A eviter", phase_guard.get("avoid", ""))
        return enriched_context

    def generate(
        self,
        *,
        text: str,
        candidate_name: str,
        session_id: str,
        session_state: dict[str, Any],
    ) -> dict[str, Any]:
        enriched_state = dict(session_state)
        enriched_state["session_id"] = session_id
        enriched_state["cv_context"] = self._build_enriched_context(
            text=text,
            candidate_name=candidate_name,
            session_state=enriched_state,
        )
        return super().generate(
            text=text,
            candidate_name=candidate_name,
            session_id=session_id,
            session_state=enriched_state,
        )

    def infer_competencies_from_interview(
        self,
        *,
        cv_profile: dict[str, Any],
        turns: list[dict[str, Any]],
        response_language: str = "fr",
    ) -> dict[str, int]:
        return self._invoke_tool(
            self.toolbox.scoring,
            {
                "cv_profile": cv_profile,
                "turns": turns,
                "response_language": response_language,
            },
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
        return self._invoke_tool(
            self.toolbox.turn_scoring,
            {
                "cv_profile": cv_profile,
                "recent_turns": recent_turns,
                "question": question,
                "answer": answer,
                "question_phase": question_phase,
                "response_language": response_language,
            },
        )

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
        return self._invoke_tool(
            self.toolbox.report,
            {
                "competencies": competencies,
                "strengths": strengths,
                "improvement_points": improvement_points,
                "visual_context": visual_context,
                "audio_context": audio_context,
                "cv_profile": cv_profile,
                "turns": turns,
                "response_language": response_language,
            },
        )

    def generate_insights_advice(
        self,
        *,
        visual_context: dict[str, Any],
        audio_context: dict[str, Any],
        stress_context: dict[str, Any],
        response_language: str = "fr",
    ) -> dict[str, Any]:
        return self._invoke_tool(
            self.toolbox.insights,
            {
                "visual_context": visual_context,
                "audio_context": audio_context,
                "stress_context": stress_context,
                "response_language": response_language,
            },
        )
