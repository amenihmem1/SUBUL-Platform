from __future__ import annotations

import unicodedata
from datetime import datetime, timezone
import os
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import load_settings
from core.session_store_factory import build_resilient_session_store
from vision.emotion import build_visual_llm_context
from voice.observations import build_audio_llm_context


def _normalize_text(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.split())


def _candidate_key(profile: dict[str, Any], session_id: str) -> str:
    for key in ("email", "linkedin", "github"):
        value = _normalize_text(profile.get(key))
        if value:
            return f"{key}:{value}"
    name = _normalize_text(profile.get("candidate_name") or profile.get("name"))
    headline = _normalize_text(profile.get("headline"))
    return f"name:{name}:{headline}" if name else f"session:{session_id}"


def _parse_datetime(value: Any) -> datetime | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _session_date(payload: dict[str, Any]) -> datetime | None:
    for value in (payload.get("finalized_at"), payload.get("updated_at")):
        parsed = _parse_datetime(value)
        if parsed is not None:
            return parsed
    turns = payload.get("turns")
    if isinstance(turns, list):
        for turn in reversed(turns):
            if isinstance(turn, dict):
                parsed = _parse_datetime(turn.get("time"))
                if parsed is not None:
                    return parsed
    return None


def _score_bucket(score: int | None) -> str:
    if score is None:
        return "Sans score"
    if score >= 80:
        return "80-100"
    if score >= 60:
        return "60-79"
    if score >= 40:
        return "40-59"
    return "0-39"


def _collect_skills(*sources: Any) -> list[str]:
    skills: list[str] = []
    for source in sources:
        if not isinstance(source, list):
            continue
        for item in source:
            skill = str(item or "").strip().lower()
            if skill:
                skills.append(skill)
    return skills


def _float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        parsed = float(value)
        return parsed if parsed > 0 else None
    return None


def _session_item(payload: dict[str, Any]) -> dict[str, Any] | None:
    session_id = str(payload.get("session_id") or "").strip()
    if not session_id:
        return None
    profile = payload.get("cv_profile") if isinstance(payload.get("cv_profile"), dict) else {}
    report = payload.get("final_report") if isinstance(payload.get("final_report"), dict) else None
    turns = payload.get("turns") if isinstance(payload.get("turns"), list) else []
    history_meta = payload.get("history_meta") if isinstance(payload.get("history_meta"), dict) else {}
    score = report.get("score_total") if isinstance(report, dict) else None
    score_total = int(score) if isinstance(score, (int, float)) else None
    candidate_name = str(profile.get("candidate_name") or profile.get("name") or "").strip() or "Candidate"
    activity_at = str(payload.get("finalized_at") or payload.get("updated_at") or "").strip()
    if not activity_at:
        for turn in reversed(turns):
            if isinstance(turn, dict) and str(turn.get("time") or "").strip():
                activity_at = str(turn.get("time")).strip()
                break
    return {
        "session_id": session_id,
        "candidate_key": _candidate_key(profile, session_id),
        "candidate_name": candidate_name,
        "headline": str(profile.get("headline") or "").strip(),
        "updated_at": activity_at,
        "turns_count": len(turns),
        "score_total": score_total,
        "status": "completed" if report is not None else "active" if turns or payload.get("cv_uploaded") else "draft",
        "title": str(history_meta.get("title") or profile.get("headline") or candidate_name or session_id).strip(),
        "response_language": str(payload.get("response_language") or "fr").strip().lower(),
        "pinned": bool(history_meta.get("pinned", False)),
        "archived": bool(history_meta.get("archived", False)),
        "top_skills": _collect_skills(profile.get("top_skills"), report.get("top_skills") if report else None)[:5],
    }


def build_dashboard_payload(payloads: list[dict[str, Any]], days: int = 7) -> dict[str, Any]:
    sessions: list[dict[str, Any]] = []
    candidates: dict[str, dict[str, Any]] = {}
    skill_counts: dict[str, int] = {}
    score_distribution = {"80-100": 0, "60-79": 0, "40-59": 0, "0-39": 0, "Sans score": 0}
    timeline: dict[str, dict[str, Any]] = {}
    voice_timeline: dict[str, dict[str, Any]] = {}
    proctoring_counts = {"visibilitychange": 0, "blur": 0, "window_resize": 0, "devtools": 0, "multiple_screens": 0}
    emotion_counts = {"happy": 0.0, "neutral": 0.0, "surprise": 0.0, "sad": 0.0, "angry": 0.0}
    competency_totals = {"communication": [], "teamwork": [], "problem_solving": [], "motivation": []}
    voice_totals = {
        "samples": 0,
        "utterances": 0,
        "speech_rate_wpm_avg": 0.0,
        "volume_score_avg": 0.0,
        "silence_pct_avg": 0.0,
        "pause_rate_per_min_avg": 0.0,
        "pitch_hz_avg": 0.0,
        "pitch_variation_hz_avg": 0.0,
        "filler_density_pct": 0.0,
    }

    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        item = _session_item(payload)
        if item is None:
            continue
        sessions.append(item)
        profile = payload.get("cv_profile") if isinstance(payload.get("cv_profile"), dict) else {}
        report = payload.get("final_report") if isinstance(payload.get("final_report"), dict) else {}
        score = item.get("score_total") if isinstance(item.get("score_total"), int) else None
        score_distribution[_score_bucket(score)] += 1

        date = _session_date(payload)
        date_key = date.date().isoformat() if date else "Sans date"
        day = timeline.setdefault(date_key, {"date": date_key, "interviews": 0, "score_sum": 0, "scored": 0})
        day["interviews"] += 1
        if score is not None:
            day["score_sum"] += score
            day["scored"] += 1

        for skill in _collect_skills(profile.get("top_skills"), report.get("top_skills")):
            skill_counts[skill] = skill_counts.get(skill, 0) + 1

        competencies = report.get("competencies") if isinstance(report.get("competencies"), dict) else {}
        for key in competency_totals:
            value = competencies.get(key)
            if isinstance(value, (int, float)):
                competency_totals[key].append(max(0, min(100, float(value) * 20 if value <= 5 else float(value))))

        response_language = str(payload.get("response_language") or "fr").strip().lower() or "fr"
        if isinstance(report.get("visual_metrics"), dict):
            visual_metrics = report.get("visual_metrics") or {}
        else:
            visual_metrics = build_visual_llm_context(
                payload.get("visual_observations") if isinstance(payload.get("visual_observations"), dict) else {},
                response_language,
            ).get("metrics", {})
        emotion_breakdown = visual_metrics.get("emotion_breakdown") or visual_metrics.get("model_emotion_breakdown")
        if isinstance(emotion_breakdown, dict):
            for key in emotion_counts:
                value = emotion_breakdown.get(key)
                if isinstance(value, (int, float)):
                    emotion_counts[key] += max(0.0, float(value))

        events = payload.get("proctoring_events")
        events = events if isinstance(events, list) else []
        for event in events:
            if not isinstance(event, dict):
                continue
            event_type = str(event.get("type") or "").strip()
            if event_type in proctoring_counts:
                proctoring_counts[event_type] += 1

        if isinstance(report.get("audio_metrics"), dict):
            audio_metrics = report.get("audio_metrics") or {}
        else:
            audio_metrics = build_audio_llm_context(
                payload.get("audio_observations") if isinstance(payload.get("audio_observations"), dict) else {},
                response_language,
            ).get("metrics", {})
        utterances = int(audio_metrics.get("utterance_count", 0) or 0)
        if utterances > 0:
            voice_totals["samples"] += 1
            voice_totals["utterances"] += utterances
            voice_day = voice_timeline.setdefault(date_key, {"date": date_key, "samples": 0, "utterances": 0})
            voice_day["samples"] += 1
            voice_day["utterances"] += utterances
            for key in (
                "speech_rate_wpm_avg",
                "volume_score_avg",
                "silence_pct_avg",
                "pause_rate_per_min_avg",
                "pitch_hz_avg",
                "pitch_variation_hz_avg",
                "filler_density_pct",
            ):
                value = _float(audio_metrics.get(key))
                if value is not None:
                    voice_totals[key] += value
                    voice_day[key] = float(voice_day.get(key, 0.0)) + value

        candidate = candidates.setdefault(
            item["candidate_key"],
            {
                "candidate_key": item["candidate_key"],
                "candidate_name": item["candidate_name"],
                "headline": item["headline"],
                "sessions_count": 0,
                "completed_count": 0,
                "best_score": None,
                "latest_score": None,
                "latest_session_id": item["session_id"],
                "latest_updated_at": item["updated_at"],
                "top_skills": [],
            },
        )
        candidate["sessions_count"] += 1
        if item["status"] == "completed":
            candidate["completed_count"] += 1
        if str(item["updated_at"] or "") >= str(candidate.get("latest_updated_at") or ""):
            candidate["latest_updated_at"] = item["updated_at"]
            candidate["latest_session_id"] = item["session_id"]
            candidate["latest_score"] = score
        if score is not None and (candidate["best_score"] is None or score > int(candidate["best_score"] or 0)):
            candidate["best_score"] = score
        for skill in item["top_skills"]:
            if skill not in candidate["top_skills"] and len(candidate["top_skills"]) < 5:
                candidate["top_skills"].append(skill)

    scored = [item for item in sessions if isinstance(item.get("score_total"), int)]
    completed = [item for item in sessions if item.get("status") == "completed"]
    accepted_count = sum(1 for item in scored if int(item["score_total"]) >= 70)
    average_score = round(sum(int(item["score_total"]) for item in scored) / len(scored)) if scored else None
    normalized_days = max(7, min(int(days or 7), 90))
    today = datetime.now(timezone.utc).date()
    timeline_items = []
    voice_timeline_items = []
    for offset in range(normalized_days - 1, -1, -1):
        date_key = today.fromordinal(today.toordinal() - offset).isoformat()
        day = timeline.get(date_key, {"date": date_key, "interviews": 0, "score_sum": 0, "scored": 0})
        scored_count = int(day.get("scored", 0) or 0)
        timeline_items.append(
            {
                "date": date_key,
                "interviews": int(day.get("interviews", 0) or 0),
                "scored": scored_count,
                "average_score": round(float(day.get("score_sum", 0) or 0) / scored_count) if scored_count else None,
            }
        )
        voice_day = voice_timeline.get(date_key, {"samples": 0, "utterances": 0})
        samples = int(voice_day.get("samples", 0) or 0)
        voice_timeline_items.append(
            {
                "date": date_key,
                "samples": samples,
                "utterances": int(voice_day.get("utterances", 0) or 0),
                "speech_rate_wpm_avg": round(float(voice_day.get("speech_rate_wpm_avg", 0) or 0) / samples, 1)
                if samples
                else None,
                "volume_score_avg": round(float(voice_day.get("volume_score_avg", 0) or 0) / samples, 1)
                if samples
                else None,
                "silence_pct_avg": round(float(voice_day.get("silence_pct_avg", 0) or 0) / samples, 1)
                if samples
                else None,
                "pause_rate_per_min_avg": round(float(voice_day.get("pause_rate_per_min_avg", 0) or 0) / samples, 1)
                if samples
                else None,
                "pitch_hz_avg": round(float(voice_day.get("pitch_hz_avg", 0) or 0) / samples, 1) if samples else None,
                "pitch_variation_hz_avg": round(float(voice_day.get("pitch_variation_hz_avg", 0) or 0) / samples, 1)
                if samples
                else None,
            }
        )

    voice_samples = int(voice_totals["samples"])
    emotion_total = sum(emotion_counts.values())
    proctoring_total = sum(proctoring_counts.values())
    labels = {"communication": "Communication", "teamwork": "Travail d'equipe", "problem_solving": "Resolution", "motivation": "Motivation"}
    emotion_labels = {"happy": "Sourire", "neutral": "Neutre", "surprise": "Surprise", "sad": "Tristesse", "angry": "Tension"}
    proctoring_labels = {
        "visibilitychange": "Changement d'onglet",
        "blur": "Perte de focus",
        "window_resize": "Reduction de fenetre",
        "devtools": "Ouverture DevTools",
        "multiple_screens": "Plusieurs ecrans",
    }
    return {
        "overview": {
            "total_candidates": len(candidates),
            "total_interviews": len(sessions),
            "completed_interviews": len(completed),
            "active_interviews": sum(1 for item in sessions if item.get("status") == "active"),
            "draft_interviews": sum(1 for item in sessions if item.get("status") == "draft"),
            "average_score": average_score,
            "accepted_count": accepted_count,
            "acceptance_rate": round((accepted_count / len(scored)) * 100) if scored else 0,
            "scored_interviews": len(scored),
            "high_potential_count": sum(1 for item in scored if int(item["score_total"]) >= 75),
            "needs_review_count": sum(1 for item in scored if int(item["score_total"]) < 50),
        },
        "timeline": timeline_items,
        "score_distribution": [{"label": label, "count": count} for label, count in score_distribution.items()],
        "skills": sorted(
            [{"skill": skill, "count": count} for skill, count in skill_counts.items()],
            key=lambda item: (-item["count"], item["skill"]),
        )[:12],
        "competencies": [
            {"key": key, "label": labels[key], "average": round(sum(values) / len(values)) if values else None, "samples": len(values)}
            for key, values in competency_totals.items()
        ],
        "emotion_distribution": [
            {"key": key, "label": emotion_labels[key], "count": round(value, 1), "percentage": round((value / emotion_total) * 100) if emotion_total else 0}
            for key, value in emotion_counts.items()
        ],
        "proctoring_alert_distribution": [
            {"key": key, "label": proctoring_labels[key], "count": value, "percentage": round((value / proctoring_total) * 100) if proctoring_total else 0}
            for key, value in proctoring_counts.items()
        ],
        "voice": {
            "samples": voice_samples,
            "utterances": int(voice_totals["utterances"]),
            "speech_rate_wpm_avg": round(voice_totals["speech_rate_wpm_avg"] / voice_samples, 1) if voice_samples else None,
            "volume_score_avg": round(voice_totals["volume_score_avg"] / voice_samples, 1) if voice_samples else None,
            "silence_pct_avg": round(voice_totals["silence_pct_avg"] / voice_samples, 1) if voice_samples else None,
            "pause_rate_per_min_avg": round(voice_totals["pause_rate_per_min_avg"] / voice_samples, 1) if voice_samples else None,
            "pitch_hz_avg": round(voice_totals["pitch_hz_avg"] / voice_samples, 1) if voice_samples else None,
            "pitch_variation_hz_avg": round(voice_totals["pitch_variation_hz_avg"] / voice_samples, 1) if voice_samples else None,
            "filler_density_pct": round(voice_totals["filler_density_pct"] / voice_samples, 1) if voice_samples else None,
            "timeline": voice_timeline_items,
        },
        "top_candidates": sorted(
            candidates.values(),
            key=lambda item: (int(item.get("best_score") or -1), str(item.get("latest_updated_at") or "")),
            reverse=True,
        )[:8],
        "recent_sessions": sorted(sessions, key=lambda item: str(item.get("updated_at") or ""), reverse=True)[:8],
    }


def build_analytics_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="SUBUL RH Analytics Service", version="0.1.0")

    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    session_store = build_resilient_session_store(settings.database_url, service_name="Analytics")
    interview_service_url = os.getenv("INTERVIEW_SERVICE_URL", "https://rh-interview-service.azurewebsites.net").rstrip("/")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "analytics"}

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "SUBUL RH Analytics Service", "status": "ok"}

    @app.get("/rh/dashboard")
    def get_hr_dashboard(limit: int = 200, days: int = 7) -> dict[str, Any]:
        normalized_limit = max(1, min(int(limit or 200), 500))
        payloads: list[dict[str, Any]] = []
        if interview_service_url:
            try:
                with httpx.Client(timeout=10.0, trust_env=False) as client:
                    response = client.get(f"{interview_service_url}/rh/internal/sessions", params={"limit": normalized_limit})
                    response.raise_for_status()
                    data = response.json()
                    raw_sessions = data.get("sessions") if isinstance(data, dict) else []
                    if isinstance(raw_sessions, list):
                        payloads = [item for item in raw_sessions if isinstance(item, dict)]
            except Exception:
                payloads = []
        if not payloads:
            payloads = session_store.list_payloads(limit=normalized_limit)
        return build_dashboard_payload(payloads, days=days)

    return app
