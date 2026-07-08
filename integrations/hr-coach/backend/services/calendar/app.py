from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.config import load_settings
from core.interview_calendar import InterviewReminderService, build_candidate_cancel_url, build_interview_calendar_store

logger = logging.getLogger(__name__)


class InterviewScheduleCreateRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    role: str = ""
    scheduled_at: str


class InterviewScheduleUpdateRequest(BaseModel):
    candidate_name: str
    candidate_email: str
    role: str = ""
    scheduled_at: str


def _looks_like_email(value: str) -> bool:
    clean = str(value or "").strip()
    if not clean or "@" not in clean:
        return False
    local_part, _, domain = clean.partition("@")
    return bool(local_part and domain and "." in domain and " " not in clean)


def _parse_future_scheduled_at(value: str) -> datetime:
    raw = str(value or "").strip()
    try:
        scheduled_at = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Scheduled time is invalid.") from exc
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    scheduled_at = scheduled_at.astimezone(timezone.utc)
    if scheduled_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future.")
    return scheduled_at


def _validate_interview_payload(
    payload: InterviewScheduleCreateRequest | InterviewScheduleUpdateRequest,
) -> tuple[str, str, str, datetime]:
    candidate_name = str(payload.candidate_name or "").strip()
    candidate_email = str(payload.candidate_email or "").strip()
    role = str(payload.role or "").strip()

    if not candidate_name or not candidate_email or not str(payload.scheduled_at or "").strip():
        raise HTTPException(status_code=400, detail="Candidate name, email, and scheduled time are required.")
    if not _looks_like_email(candidate_email):
        raise HTTPException(status_code=400, detail="Candidate email is invalid.")

    return candidate_name, candidate_email, role, _parse_future_scheduled_at(payload.scheduled_at)


def build_calendar_app() -> FastAPI:
    settings = load_settings()
    app = FastAPI(title="SUBUL RH Calendar Service", version="0.1.0")

    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    interview_store = build_interview_calendar_store(settings.database_url)
    interview_reminders = InterviewReminderService(interview_store, settings.smtp, settings.public_app_url)

    @app.on_event("startup")
    def startup_interview_reminders() -> None:
        interview_reminders.start()

    @app.on_event("shutdown")
    def shutdown_interview_reminders() -> None:
        interview_reminders.stop()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "calendar"}

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "SUBUL RH Calendar Service", "status": "ok"}

    @app.get("/rh/interviews")
    def list_interviews() -> dict[str, Any]:
        return {
            "status": "ok",
            "interviews": [item.to_payload() for item in interview_store.list()],
            "reminders": interview_reminders.describe(),
        }

    @app.post("/rh/interviews")
    def create_interview(payload: InterviewScheduleCreateRequest) -> dict[str, Any]:
        candidate_name, candidate_email, role, scheduled_at = _validate_interview_payload(payload)
        created = interview_store.create(
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            role=role,
            scheduled_at=scheduled_at.isoformat(),
            reminder_minutes_before=settings.smtp.reminder_minutes_before,
        )
        candidate_cancel_url = build_candidate_cancel_url(settings.public_app_url, created.cancel_token)
        created_payload = created.to_payload()
        if candidate_cancel_url:
            created_payload["candidateCancelUrl"] = candidate_cancel_url

        if interview_reminders.enabled:
            try:
                interview_reminders.send_confirmation_email(created)
            except Exception:
                logger.exception("Failed to send interview confirmation email for %s", created.id)

        return {
            "status": "ok",
            "interview": created_payload,
            "candidateCancelUrl": candidate_cancel_url,
            "interviews": [item.to_payload() for item in interview_store.list()],
            "reminders": interview_reminders.describe(),
        }

    @app.patch("/rh/interviews/{interview_id}")
    def update_interview(interview_id: str, payload: InterviewScheduleUpdateRequest) -> dict[str, Any]:
        candidate_name, candidate_email, role, scheduled_at = _validate_interview_payload(payload)
        updated = interview_store.update(
            interview_id,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            role=role,
            scheduled_at=scheduled_at.isoformat(),
        )
        if updated is None:
            raise HTTPException(status_code=404, detail="Interview not found.")

        return {
            "status": "ok",
            "interview": updated.to_payload(),
            "interviews": [item.to_payload() for item in interview_store.list()],
            "reminders": interview_reminders.describe(),
        }

    @app.delete("/rh/interviews/{interview_id}")
    def delete_interview(interview_id: str) -> dict[str, Any]:
        deleted = interview_store.delete(interview_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Interview not found.")
        return {
            "status": "ok",
            "deleted": True,
            "interview_id": interview_id,
            "interviews": [item.to_payload() for item in interview_store.list()],
            "reminders": interview_reminders.describe(),
        }

    @app.get("/rh/interviews/cancel/{cancel_token}")
    def get_interview_cancel_details(cancel_token: str) -> dict[str, Any]:
        interview = interview_store.get_by_cancel_token(cancel_token)
        if interview is None:
            raise HTTPException(status_code=404, detail="Interview not found.")
        payload = interview.to_payload()
        candidate_cancel_url = build_candidate_cancel_url(settings.public_app_url, interview.cancel_token)
        if candidate_cancel_url:
            payload["candidateCancelUrl"] = candidate_cancel_url
        return {
            "status": "ok",
            "interview": payload,
        }

    @app.post("/rh/interviews/cancel/{cancel_token}")
    def cancel_interview(cancel_token: str) -> dict[str, Any]:
        interview = interview_store.get_by_cancel_token(cancel_token)
        if interview is None:
            raise HTTPException(status_code=404, detail="Interview not found.")
        if interview.status == "cancelled":
            raise HTTPException(status_code=409, detail="Interview is already cancelled.")
        if interview.status != "planned":
            raise HTTPException(status_code=409, detail="Only planned interviews can be cancelled.")

        cancelled = interview_store.cancel_by_token(cancel_token)
        if cancelled is None:
            raise HTTPException(status_code=404, detail="Interview not found.")

        payload = cancelled.to_payload()
        candidate_cancel_url = build_candidate_cancel_url(settings.public_app_url, cancelled.cancel_token)
        if candidate_cancel_url:
            payload["candidateCancelUrl"] = candidate_cancel_url
        return {
            "status": "ok",
            "cancelled": True,
            "interview": payload,
        }

    return app
