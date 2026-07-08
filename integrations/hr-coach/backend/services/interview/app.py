from __future__ import annotations

import logging
import time
import unicodedata
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.config import load_settings
from core.factories import SilentTTS, build_orchestrator
from core.session_store_factory import build_resilient_session_store
from interview_ai.base import LLMRateLimitError
from vision.emotion import build_visual_llm_context
from voice.observations import build_audio_llm_context

logger = logging.getLogger(__name__)
_CV_REQUIRED_MESSAGE = "Veuillez telecharger le CV avant de commencer l'entretien."


class CandidateMessage(BaseModel):
    text: str
    candidate_name: str = "Candidate"
    sender_name: str = ""


class SessionMetaUpdateRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None
    archived: bool | None = None


class SessionPreferencesUpdateRequest(BaseModel):
    preferred_input_mode: str = "mixed"


class FinalizeSessionRequest(BaseModel):
    preferred_input_mode: str = "mixed"
    finalized_by: str = "user"


class InternalObservationsSyncRequest(BaseModel):
    visual_observations: dict[str, Any] | None = None
    audio_observations: dict[str, Any] | None = None
    proctoring_events: list[dict[str, Any]] | None = None


def _normalize_text(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.split())


def _candidate_key(profile: dict[str, Any], session_id: str) -> str:
    email = _normalize_text(profile.get("email"))
    linkedin = _normalize_text(profile.get("linkedin"))
    github = _normalize_text(profile.get("github"))
    name = _normalize_text(profile.get("candidate_name") or profile.get("name"))
    headline = _normalize_text(profile.get("headline"))
    if email:
        return f"email:{email}"
    if linkedin:
        return f"linkedin:{linkedin}"
    if github:
        return f"github:{github}"
    if name:
        return f"name:{name}:{headline}"
    return f"session:{session_id}"


def _normalize_title(value: str | None) -> str:
    return " ".join(str(value or "").split()).strip()[:120]


def _format_session_title(profile: dict[str, Any], turns: list[dict[str, Any]], session_id: str) -> str:
    headline = str(profile.get("headline") or "").strip()
    name = str(profile.get("candidate_name") or profile.get("name") or "").strip()
    if headline:
        return headline
    for turn in turns:
        if isinstance(turn, dict) and str(turn.get("say") or "").strip():
            question = " ".join(str(turn.get("say")).split())
            return question[:72] + ("..." if len(question) > 72 else "")
    return f"Entretien RH - {name}" if name else session_id


def _history_preview(payload: dict[str, Any], turns: list[dict[str, Any]]) -> str:
    report = payload.get("final_report")
    if isinstance(report, dict) and str(report.get("summary") or "").strip():
        summary = str(report.get("summary")).strip()
        return summary[:140] + ("..." if len(summary) > 140 else "")
    for turn in reversed(turns):
        if isinstance(turn, dict) and str(turn.get("candidate_text") or "").strip():
            answer = str(turn.get("candidate_text")).strip()
            return answer[:140] + ("..." if len(answer) > 140 else "")
    return ""


def _activity_at(payload: dict[str, Any], turns: list[dict[str, Any]]) -> str:
    finalized_at = str(payload.get("finalized_at") or "").strip()
    if finalized_at:
        return finalized_at
    for turn in reversed(turns):
        if isinstance(turn, dict) and str(turn.get("time") or "").strip():
            return str(turn.get("time")).strip()
    return str(payload.get("updated_at") or "").strip()


def _history_item(payload: dict[str, Any]) -> dict[str, Any] | None:
    session_id = str(payload.get("session_id") or "").strip()
    if not session_id:
        return None
    profile = payload.get("cv_profile") if isinstance(payload.get("cv_profile"), dict) else {}
    turns = payload.get("turns") if isinstance(payload.get("turns"), list) else []
    report = payload.get("final_report") if isinstance(payload.get("final_report"), dict) else None
    history_meta = payload.get("history_meta") if isinstance(payload.get("history_meta"), dict) else {}
    score = report.get("score_total") if isinstance(report, dict) else None
    score_total = int(score) if isinstance(score, (int, float)) else None
    title_override = _normalize_title(history_meta.get("title"))
    return {
        "session_id": session_id,
        "candidate_key": _candidate_key(profile, session_id),
        "candidate_name": str(profile.get("candidate_name") or profile.get("name") or "").strip() or "Candidate",
        "headline": str(profile.get("headline") or "").strip(),
        "updated_at": _activity_at(payload, turns),
        "turns_count": len(turns),
        "score_total": score_total,
        "status": "completed" if report is not None else "active" if turns or payload.get("cv_uploaded") else "draft",
        "title": title_override or _format_session_title(profile, turns, session_id),
        "preview": _history_preview(payload, turns),
        "response_language": str(payload.get("response_language") or "fr").strip().lower(),
        "pinned": bool(history_meta.get("pinned", False)),
        "archived": bool(history_meta.get("archived", False)),
        "title_customized": bool(title_override),
    }


def _history_groups(payloads: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, dict[str, Any]] = {}
    sessions_by_id: dict[str, dict[str, Any]] = {}
    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        item = _history_item(payload)
        if item is None:
            continue
        existing_item = sessions_by_id.get(item["session_id"])
        if existing_item and str(existing_item.get("updated_at") or "") >= str(item.get("updated_at") or ""):
            continue
        sessions_by_id[item["session_id"]] = item

    sessions = list(sessions_by_id.values())
    for item in sessions:
        group = grouped.setdefault(
            item["candidate_key"],
            {
                "candidate_key": item["candidate_key"],
                "candidate_name": item["candidate_name"],
                "headline": item["headline"],
                "latest_updated_at": item["updated_at"],
                "sessions": [],
            },
        )
        if item["updated_at"] > str(group.get("latest_updated_at") or ""):
            group["latest_updated_at"] = item["updated_at"]
        group["sessions"].append(item)
    candidates = []
    for group in grouped.values():
        group["sessions"] = sorted(group["sessions"], key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        group["sessions_count"] = len(group["sessions"])
        group["progression"] = {"latest_score": None, "previous_score": None, "delta": None, "label": "no_completed_session"}
        scored = [item for item in group["sessions"] if isinstance(item.get("score_total"), int)]
        if scored:
            latest = scored[0]["score_total"]
            previous = scored[1]["score_total"] if len(scored) > 1 else None
            group["progression"] = {
                "latest_score": latest,
                "previous_score": previous,
                "delta": latest - previous if isinstance(previous, int) else None,
                "label": "first_completed_session" if previous is None else "improving" if latest > previous else "declining" if latest < previous else "stable",
            }
        candidates.append(group)
    return {
        "candidates": sorted(candidates, key=lambda item: str(item.get("latest_updated_at") or ""), reverse=True),
        "sessions": sorted(
            sessions,
            key=lambda item: (1 if item.get("pinned") else 0, str(item.get("updated_at") or "")),
            reverse=True,
        ),
        "total_candidates": len(candidates),
        "total_sessions": len(sessions),
    }


def _update_history_meta(session_store, session_id: str, payload: SessionMetaUpdateRequest) -> dict[str, Any] | None:
    stored = session_store.load(session_id)
    if not isinstance(stored, dict):
        return None
    meta = dict(stored.get("history_meta")) if isinstance(stored.get("history_meta"), dict) else {}
    if payload.title is not None:
        title = _normalize_title(payload.title)
        if title:
            meta["title"] = title
        else:
            meta.pop("title", None)
    if payload.pinned is not None:
        meta["pinned"] = bool(payload.pinned)
    if payload.archived is not None:
        meta["archived"] = bool(payload.archived)
    stored["history_meta"] = meta
    session_store.save(session_id, stored)
    return session_store.load(session_id) or stored


def _resolve_candidate_name(payload: CandidateMessage) -> str:
    return (payload.candidate_name or payload.sender_name or "Candidate").strip() or "Candidate"


def _ensure_cv_uploaded(orchestrator: Any, session_id: str) -> None:
    state = orchestrator._get_or_create_session(session_id)
    if not state.cv_uploaded:
        raise HTTPException(status_code=400, detail=_CV_REQUIRED_MESSAGE)


def _reload_session(orchestrator: Any, session_id: str) -> Any:
    getattr(orchestrator, "sessions", {}).pop(session_id, None)
    return orchestrator._get_or_create_session(session_id)


def _final_report(orchestrator: Any, session_id: str, response_language: str) -> dict[str, Any] | None:
    session = orchestrator._get_or_create_session(session_id)
    if session.final_report is None:
        return None
    stored_language = str(session.response_language or "").strip().lower() or "fr"
    if stored_language == response_language:
        if orchestrator._report_needs_llm_regeneration(session.final_report):
            session.final_report = orchestrator._build_final_report(session)
            orchestrator._persist_session(session)
        return session.final_report
    original_language = session.response_language
    try:
        session.response_language = response_language
        return orchestrator._build_final_report(session)
    finally:
        session.response_language = original_language


def _insights_context(orchestrator: Any, session_id: str, response_language: str) -> dict[str, Any]:
    cached = orchestrator.get_cached_insights(session_id, response_language=response_language)
    if isinstance(cached, dict) and cached:
        return cached
    session = orchestrator._get_or_create_session(session_id)
    visual_context = build_visual_llm_context(session.visual_observations, response_language)
    audio_context = build_audio_llm_context(session.audio_observations, response_language)
    stress_context: dict[str, Any] = {}
    insights_advice: dict[str, Any] | None = None
    try:
        insights_advice = orchestrator.intelligence.generate_insights_advice(
            visual_context=visual_context,
            audio_context=audio_context,
            stress_context=stress_context,
            response_language=response_language,
        )
    except Exception:
        insights_advice = None
    return orchestrator.store_cached_insights(
        session_id,
        response_language=response_language,
        visual_context=visual_context,
        audio_context=audio_context,
        stress_context=stress_context,
        insights_advice=insights_advice,
    )


def build_interview_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="SUBUL RH Interview Service", version="0.1.0")
    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    session_store = build_resilient_session_store(settings.database_url, service_name="Interview")
    orchestrator_cache: Any | None = None

    def get_orchestrator() -> Any:
        nonlocal orchestrator_cache
        if orchestrator_cache is None:
            orchestrator_cache = build_orchestrator(app_settings=settings, tts=SilentTTS(), session_store=session_store)
        return orchestrator_cache

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "interview"}

    @app.get("/robots933456.txt")
    def azure_warmup() -> str:
        return "ok"

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "SUBUL RH Interview Service", "status": "ok"}

    @app.post("/rh/internal/sessions/{session_id}/observations")
    def sync_media_observations(session_id: str, payload: InternalObservationsSyncRequest) -> dict[str, Any]:
        patch: dict[str, Any] = {"session_id": session_id, "cached_insights": {}}
        if isinstance(payload.visual_observations, dict):
            patch["visual_observations"] = payload.visual_observations
        if isinstance(payload.audio_observations, dict):
            patch["audio_observations"] = payload.audio_observations
        if isinstance(payload.proctoring_events, list):
            patch["proctoring_events"] = payload.proctoring_events

        session_store.save(session_id, patch)
        if orchestrator_cache is not None:
            getattr(orchestrator_cache, "sessions", {}).pop(session_id, None)
        return {
            "status": "ok",
            "session_id": session_id,
            "synced": [key for key in ("visual_observations", "audio_observations", "proctoring_events") if key in patch],
        }

    @app.get("/rh/internal/sessions")
    def list_internal_sessions(limit: int = 200) -> dict[str, Any]:
        payloads = session_store.list_payloads(limit=max(1, min(int(limit or 200), 500)))
        return {"sessions": payloads}

    @app.get("/rh/sessions")
    def list_sessions(limit: int = 60) -> dict[str, Any]:
        payloads = session_store.list_payloads(limit=max(1, min(int(limit or 60), 200)))
        return _history_groups(payloads)

    @app.get("/rh/sessions/{session_id}")
    def get_session(session_id: str, include_insights: bool = False, language: str = "") -> dict[str, Any]:
        orchestrator = get_orchestrator()
        state = _reload_session(orchestrator, session_id)
        persisted_payload = session_store.load(session_id) or {}
        requested_language = str(language or "").strip().lower()
        response_language = requested_language if requested_language in {"fr", "en"} else (state.response_language or "fr").strip().lower() or "fr"
        insights = _insights_context(orchestrator, session_id, response_language) if include_insights else {}
        return {
            "session_id": state.session_id,
            "candidate_key": _candidate_key(state.cv_profile, state.session_id),
            "last_question_index": state.last_question_index,
            "turns_count": len(state.turns),
            "turns": state.turns,
            "final_report": _final_report(orchestrator, session_id, response_language),
            "cv_uploaded": state.cv_uploaded,
            "cv_profile": state.cv_profile,
            "response_language": response_language,
            "updated_at": str(persisted_payload.get("updated_at") or ""),
            "interview_status": state.interview_status,
            "finalized_at": state.finalized_at,
            "finalized_by": state.finalized_by,
            "preferred_input_mode": state.preferred_input_mode,
            "visual_observations": state.visual_observations,
            "audio_observations": state.audio_observations,
            "proctoring_events": state.proctoring_events,
            "proctoring_alerts_count": len(state.proctoring_events),
            "visual_context": insights.get("visual_context"),
            "audio_context": insights.get("audio_context"),
            "stress_context": insights.get("stress_context"),
            "insights_advice": insights.get("insights_advice"),
        }

    @app.patch("/rh/sessions/{session_id}/meta")
    def update_session_meta(session_id: str, payload: SessionMetaUpdateRequest) -> dict[str, Any]:
        updated = _update_history_meta(session_store, session_id, payload)
        if updated is None:
            raise HTTPException(status_code=404, detail="Session introuvable.")
        item = _history_item(updated)
        if item is None:
            raise HTTPException(status_code=500, detail="Session metadata could not be rebuilt.")
        return {"status": "ok", "session": item}

    @app.patch("/rh/sessions/{session_id}/preferences")
    def update_session_preferences(session_id: str, payload: SessionPreferencesUpdateRequest) -> dict[str, Any]:
        orchestrator = get_orchestrator()
        session = orchestrator.set_preferred_input_mode(session_id, payload.preferred_input_mode)
        return {
            "status": "ok",
            "session_id": session.session_id,
            "preferred_input_mode": session.preferred_input_mode,
            "interview_status": session.interview_status,
        }

    @app.delete("/rh/sessions/{session_id}")
    def delete_session(session_id: str) -> dict[str, Any]:
        orchestrator = get_orchestrator()
        existed_in_memory = session_id in getattr(orchestrator, "sessions", {})
        if existed_in_memory:
            orchestrator.sessions.pop(session_id, None)
        deleted = session_store.delete(session_id)
        if not deleted and not existed_in_memory:
            raise HTTPException(status_code=404, detail="Session introuvable.")
        return {"status": "ok", "deleted": True, "session_id": session_id}

    @app.post("/rh/sessions/{session_id}/finalize")
    def finalize_session(session_id: str, payload: FinalizeSessionRequest) -> dict[str, Any]:
        orchestrator = get_orchestrator()
        state = _reload_session(orchestrator, session_id)
        if not state.turns and not state.cv_uploaded:
            raise HTTPException(status_code=400, detail="Impossible de finaliser une session vide.")
        try:
            output = orchestrator.finalize_session(
                session_id,
                finalized_by=payload.finalized_by,
                preferred_input_mode=payload.preferred_input_mode,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Echec finalisation entretien: {exc}") from exc
        return output.model_dump()

    @app.post("/rh/sessions/{session_id}/message")
    def handle_message(session_id: str, payload: CandidateMessage) -> dict[str, Any]:
        orchestrator = get_orchestrator()
        start = time.perf_counter()
        try:
            _ensure_cv_uploaded(orchestrator, session_id)
            _reload_session(orchestrator, session_id)
            out = orchestrator.handle_candidate_text(
                session_id=session_id,
                text=payload.text,
                candidate_name=_resolve_candidate_name(payload),
            )
            logger.info("API /rh/sessions/%s/message total_ms=%.1f", session_id, (time.perf_counter() - start) * 1000)
            return out.model_dump()
        except HTTPException:
            raise
        except LLMRateLimitError as exc:
            raise HTTPException(status_code=429, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Echec traitement message RH: {exc}") from exc

    @app.post("/rh/sessions/{session_id}/cv")
    async def upload_cv(session_id: str, file: UploadFile = File(...)) -> dict[str, Any]:
        orchestrator = get_orchestrator()
        filename = (file.filename or "").strip()
        if not filename:
            raise HTTPException(status_code=400, detail="Nom de fichier invalide.")
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Fichier vide.")
        try:
            result = orchestrator.ingest_candidate_cv(session_id=session_id, filename=filename, raw_bytes=raw)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Echec ingestion CV: {exc}") from exc
        profile = result.get("profile") if isinstance(result.get("profile"), dict) else {}
        result["candidate_key"] = _candidate_key(profile, session_id)
        return result

    @app.websocket("/ws/rh/{session_id}")
    async def rh_ws(websocket: WebSocket, session_id: str):
        orchestrator = get_orchestrator()
        await websocket.accept()
        try:
            while True:
                candidate_text = await websocket.receive_text()
                try:
                    try:
                        _ensure_cv_uploaded(orchestrator, session_id)
                        _reload_session(orchestrator, session_id)
                    except HTTPException as exc:
                        await websocket.send_json({"error": exc.detail, "status": exc.status_code})
                        continue
                    out = orchestrator.handle_candidate_text(
                        session_id=session_id,
                        text=candidate_text,
                        candidate_name="Candidate",
                    )
                    await websocket.send_json(out.model_dump())
                except LLMRateLimitError as exc:
                    await websocket.send_json({"error": str(exc), "status": 429})
        except WebSocketDisconnect:
            return

    return app
