from __future__ import annotations

import json
import logging
import os
import smtplib
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any
from uuid import uuid4

from core.config import SMTPSettings
from core.paths import INTERVIEWS_DIR

logger = logging.getLogger(__name__)

INTERVIEWS_FILE = INTERVIEWS_DIR / "scheduled_interviews.json"
VALID_STATUSES = {"planned", "completed", "cancelled"}


def _read_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _default_interviews_file() -> Path:
    configured_path = str(os.getenv("INTERVIEW_CALENDAR_FILE") or os.getenv("INTERVIEW_CALENDAR_PATH") or "").strip()
    if configured_path:
        return Path(configured_path)
    return INTERVIEWS_FILE


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_datetime(value: str) -> str:
    parsed = datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def _format_local_datetime(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone().strftime("%d/%m/%Y %H:%M")


def _normalize_base_url(value: str) -> str:
    return str(value or "").strip().rstrip("/")


def build_candidate_cancel_url(public_app_url: str, cancel_token: str) -> str:
    base_url = _normalize_base_url(public_app_url)
    token = str(cancel_token or "").strip()
    if not base_url or not token:
        return ""
    return f"{base_url}/interview-cancel/{token}"


@dataclass(frozen=True, slots=True)
class ScheduledInterview:
    id: str
    candidate_name: str
    candidate_email: str
    role: str
    scheduled_at: str
    duration_minutes: int
    status: str
    created_at: str
    reminder_minutes_before: int
    cancel_token: str
    reminder_sent_at: str = ""
    cancelled_at: str = ""

    def to_payload(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "candidateName": self.candidate_name,
            "candidateEmail": self.candidate_email,
            "role": self.role,
            "scheduledAt": self.scheduled_at,
            "durationMinutes": self.duration_minutes,
            "status": self.status,
            "createdAt": self.created_at,
            "reminderMinutesBefore": self.reminder_minutes_before,
            "candidateCancelToken": self.cancel_token,
            "reminderSentAt": self.reminder_sent_at,
            "cancelledAt": self.cancelled_at,
        }


def _normalize_interview(item: Any) -> ScheduledInterview | None:
    if not isinstance(item, dict):
        return None

    interview_id = str(item.get("id") or "").strip()
    candidate_name = str(item.get("candidateName") or item.get("candidate_name") or "").strip()
    candidate_email = str(item.get("candidateEmail") or item.get("candidate_email") or "").strip()
    role = str(item.get("role") or "").strip()
    scheduled_raw = str(item.get("scheduledAt") or item.get("scheduled_at") or "").strip()
    created_raw = str(item.get("createdAt") or item.get("created_at") or "").strip() or _utc_now().isoformat()

    if not interview_id or not candidate_name or not candidate_email or not scheduled_raw:
        return None

    try:
        scheduled_at = _normalize_datetime(scheduled_raw)
        created_at = _normalize_datetime(created_raw)
    except ValueError:
        return None

    try:
        duration_minutes = max(15, int(item.get("durationMinutes") or item.get("duration_minutes") or 45))
    except (TypeError, ValueError):
        duration_minutes = 45

    try:
        reminder_minutes_before = max(
            1,
            int(item.get("reminderMinutesBefore") or item.get("reminder_minutes_before") or 60),
        )
    except (TypeError, ValueError):
        reminder_minutes_before = 60

    status = str(item.get("status") or "planned").strip().lower()
    if status not in VALID_STATUSES:
        status = "planned"

    cancel_token = str(item.get("candidateCancelToken") or item.get("cancel_token") or "").strip() or interview_id or str(uuid4())
    reminder_sent_at = str(item.get("reminderSentAt") or item.get("reminder_sent_at") or "").strip()
    if reminder_sent_at:
        try:
            reminder_sent_at = _normalize_datetime(reminder_sent_at)
        except ValueError:
            reminder_sent_at = ""

    cancelled_at = str(item.get("cancelledAt") or item.get("cancelled_at") or "").strip()
    if cancelled_at:
        try:
            cancelled_at = _normalize_datetime(cancelled_at)
        except ValueError:
            cancelled_at = ""

    return ScheduledInterview(
        id=interview_id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        role=role,
        scheduled_at=scheduled_at,
        duration_minutes=duration_minutes,
        status=status,
        created_at=created_at,
        reminder_minutes_before=reminder_minutes_before,
        cancel_token=cancel_token,
        reminder_sent_at=reminder_sent_at,
        cancelled_at=cancelled_at,
    )


class InterviewCalendarStore:
    def __init__(self, path: Path | None = None) -> None:
        self.path = path or _default_interviews_file()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def _read_locked(self) -> list[ScheduledInterview]:
        if not self.path.exists():
            return []
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except Exception:
            logger.exception("Failed to read scheduled interviews.")
            return []
        if not isinstance(raw, list):
            return []
        interviews = [entry for entry in (_normalize_interview(item) for item in raw) if entry is not None]
        return sorted(interviews, key=lambda item: item.scheduled_at)

    def _write_locked(self, interviews: list[ScheduledInterview]) -> None:
        payload = [item.to_payload() for item in sorted(interviews, key=lambda entry: entry.scheduled_at)]
        self.path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def list(self) -> list[ScheduledInterview]:
        with self._lock:
            return self._read_locked()

    def create(
        self,
        *,
        candidate_name: str,
        candidate_email: str,
        role: str,
        scheduled_at: str,
        reminder_minutes_before: int,
    ) -> ScheduledInterview:
        with self._lock:
            interviews = self._read_locked()
            created = ScheduledInterview(
                id=str(uuid4()),
                candidate_name=candidate_name.strip(),
                candidate_email=candidate_email.strip(),
                role=role.strip(),
                scheduled_at=_normalize_datetime(scheduled_at),
                duration_minutes=45,
                status="planned",
                created_at=_utc_now().isoformat(),
                reminder_minutes_before=max(1, int(reminder_minutes_before or 60)),
                cancel_token=str(uuid4()),
            )
            interviews.append(created)
            self._write_locked(interviews)
            return created

    def delete(self, interview_id: str) -> bool:
        with self._lock:
            interviews = self._read_locked()
            next_interviews = [item for item in interviews if item.id != interview_id]
            if len(next_interviews) == len(interviews):
                return False
            self._write_locked(next_interviews)
            return True

    def update(
        self,
        interview_id: str,
        *,
        candidate_name: str,
        candidate_email: str,
        role: str,
        scheduled_at: str,
    ) -> ScheduledInterview | None:
        target_id = str(interview_id or "").strip()
        if not target_id:
            return None

        with self._lock:
            interviews = self._read_locked()
            updated: ScheduledInterview | None = None
            next_items: list[ScheduledInterview] = []

            for item in interviews:
                if item.id != target_id:
                    next_items.append(item)
                    continue

                normalized_scheduled_at = _normalize_datetime(scheduled_at)
                updated = ScheduledInterview(
                    id=item.id,
                    candidate_name=candidate_name.strip(),
                    candidate_email=candidate_email.strip(),
                    role=role.strip(),
                    scheduled_at=normalized_scheduled_at,
                    duration_minutes=item.duration_minutes,
                    status=item.status,
                    created_at=item.created_at,
                    reminder_minutes_before=item.reminder_minutes_before,
                    cancel_token=item.cancel_token,
                    reminder_sent_at="" if normalized_scheduled_at != item.scheduled_at else item.reminder_sent_at,
                    cancelled_at=item.cancelled_at,
                )
                next_items.append(updated)

            if updated is None:
                return None

            self._write_locked(next_items)
            return updated

    def get_by_id(self, interview_id: str) -> ScheduledInterview | None:
        target_id = str(interview_id or "").strip()
        if not target_id:
            return None
        with self._lock:
            for item in self._read_locked():
                if item.id == target_id:
                    return item
        return None

    def get_by_cancel_token(self, cancel_token: str) -> ScheduledInterview | None:
        token = str(cancel_token or "").strip()
        if not token:
            return None
        with self._lock:
            for item in self._read_locked():
                if item.cancel_token == token:
                    return item
        return None

    def cancel_by_token(self, cancel_token: str) -> ScheduledInterview | None:
        token = str(cancel_token or "").strip()
        if not token:
            return None

        with self._lock:
            interviews = self._read_locked()
            updated: ScheduledInterview | None = None
            next_items: list[ScheduledInterview] = []
            cancelled_at = _utc_now().isoformat()

            for item in interviews:
                if item.cancel_token != token:
                    next_items.append(item)
                    continue
                updated = ScheduledInterview(
                    id=item.id,
                    candidate_name=item.candidate_name,
                    candidate_email=item.candidate_email,
                    role=item.role,
                    scheduled_at=item.scheduled_at,
                    duration_minutes=item.duration_minutes,
                    status="cancelled",
                    created_at=item.created_at,
                    reminder_minutes_before=item.reminder_minutes_before,
                    cancel_token=item.cancel_token,
                    reminder_sent_at=item.reminder_sent_at,
                    cancelled_at=cancelled_at,
                )
                next_items.append(updated)

            if updated is None:
                return None

            self._write_locked(next_items)
            return updated

    def mark_reminder_sent(self, interview_id: str, sent_at: str | None = None) -> ScheduledInterview | None:
        with self._lock:
            interviews = self._read_locked()
            updated: ScheduledInterview | None = None
            next_items: list[ScheduledInterview] = []
            reminder_sent_at = _normalize_datetime(sent_at or _utc_now().isoformat())
            for item in interviews:
                if item.id != interview_id:
                    next_items.append(item)
                    continue
                updated = ScheduledInterview(
                    id=item.id,
                    candidate_name=item.candidate_name,
                    candidate_email=item.candidate_email,
                    role=item.role,
                    scheduled_at=item.scheduled_at,
                    duration_minutes=item.duration_minutes,
                    status=item.status,
                    created_at=item.created_at,
                    reminder_minutes_before=item.reminder_minutes_before,
                    cancel_token=item.cancel_token,
                    reminder_sent_at=reminder_sent_at,
                )
                next_items.append(updated)
            if updated is None:
                return None
            self._write_locked(next_items)
            return updated


class PostgresInterviewCalendarStore:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url.strip()
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for PostgreSQL interview calendar storage.")
        self._ensure_table()

    def _connect(self):
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError("psycopg is required for PostgreSQL interview calendar storage.") from exc
        return psycopg.connect(self.database_url)

    def _ensure_table(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS scheduled_interviews (
                    interview_id TEXT PRIMARY KEY,
                    payload JSONB NOT NULL,
                    scheduled_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_scheduled_interviews_scheduled_at
                ON scheduled_interviews (scheduled_at)
                """
            )

    def _row_to_interview(self, payload: Any) -> ScheduledInterview | None:
        return _normalize_interview(payload)

    def list(self) -> list[ScheduledInterview]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT payload FROM scheduled_interviews ORDER BY scheduled_at ASC"
            ).fetchall()
        return [item for item in (self._row_to_interview(row[0]) for row in rows) if item is not None]

    def _save(self, interview: ScheduledInterview) -> None:
        payload = json.dumps(interview.to_payload())
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO scheduled_interviews (interview_id, payload, scheduled_at, updated_at)
                VALUES (%s, %s::jsonb, %s, NOW())
                ON CONFLICT (interview_id) DO UPDATE SET
                    payload = EXCLUDED.payload,
                    scheduled_at = EXCLUDED.scheduled_at,
                    updated_at = NOW()
                """,
                (interview.id, payload, interview.scheduled_at),
            )

    def create(
        self,
        *,
        candidate_name: str,
        candidate_email: str,
        role: str,
        scheduled_at: str,
        reminder_minutes_before: int,
    ) -> ScheduledInterview:
        created = ScheduledInterview(
            id=str(uuid4()),
            candidate_name=candidate_name.strip(),
            candidate_email=candidate_email.strip(),
            role=role.strip(),
            scheduled_at=_normalize_datetime(scheduled_at),
            duration_minutes=45,
            status="planned",
            created_at=_utc_now().isoformat(),
            reminder_minutes_before=max(1, int(reminder_minutes_before or 60)),
            cancel_token=str(uuid4()),
        )
        self._save(created)
        return created

    def delete(self, interview_id: str) -> bool:
        target_id = str(interview_id or "").strip()
        if not target_id:
            return False
        with self._connect() as conn:
            cursor = conn.execute("DELETE FROM scheduled_interviews WHERE interview_id = %s", (target_id,))
            return cursor.rowcount > 0

    def update(
        self,
        interview_id: str,
        *,
        candidate_name: str,
        candidate_email: str,
        role: str,
        scheduled_at: str,
    ) -> ScheduledInterview | None:
        item = self.get_by_id(interview_id)
        if item is None:
            return None
        normalized_scheduled_at = _normalize_datetime(scheduled_at)
        updated = ScheduledInterview(
            id=item.id,
            candidate_name=candidate_name.strip(),
            candidate_email=candidate_email.strip(),
            role=role.strip(),
            scheduled_at=normalized_scheduled_at,
            duration_minutes=item.duration_minutes,
            status=item.status,
            created_at=item.created_at,
            reminder_minutes_before=item.reminder_minutes_before,
            cancel_token=item.cancel_token,
            reminder_sent_at="" if normalized_scheduled_at != item.scheduled_at else item.reminder_sent_at,
            cancelled_at=item.cancelled_at,
        )
        self._save(updated)
        return updated

    def get_by_id(self, interview_id: str) -> ScheduledInterview | None:
        target_id = str(interview_id or "").strip()
        if not target_id:
            return None
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM scheduled_interviews WHERE interview_id = %s",
                (target_id,),
            ).fetchone()
        return self._row_to_interview(row[0]) if row else None

    def get_by_cancel_token(self, cancel_token: str) -> ScheduledInterview | None:
        token = str(cancel_token or "").strip()
        if not token:
            return None
        with self._connect() as conn:
            row = conn.execute(
                "SELECT payload FROM scheduled_interviews WHERE payload->>'candidateCancelToken' = %s LIMIT 1",
                (token,),
            ).fetchone()
        return self._row_to_interview(row[0]) if row else None

    def cancel_by_token(self, cancel_token: str) -> ScheduledInterview | None:
        item = self.get_by_cancel_token(cancel_token)
        if item is None:
            return None
        cancelled = ScheduledInterview(
            id=item.id,
            candidate_name=item.candidate_name,
            candidate_email=item.candidate_email,
            role=item.role,
            scheduled_at=item.scheduled_at,
            duration_minutes=item.duration_minutes,
            status="cancelled",
            created_at=item.created_at,
            reminder_minutes_before=item.reminder_minutes_before,
            cancel_token=item.cancel_token,
            reminder_sent_at=item.reminder_sent_at,
            cancelled_at=_utc_now().isoformat(),
        )
        self._save(cancelled)
        return cancelled

    def mark_reminder_sent(self, interview_id: str, sent_at: str | None = None) -> ScheduledInterview | None:
        item = self.get_by_id(interview_id)
        if item is None:
            return None
        updated = ScheduledInterview(
            id=item.id,
            candidate_name=item.candidate_name,
            candidate_email=item.candidate_email,
            role=item.role,
            scheduled_at=item.scheduled_at,
            duration_minutes=item.duration_minutes,
            status=item.status,
            created_at=item.created_at,
            reminder_minutes_before=item.reminder_minutes_before,
            cancel_token=item.cancel_token,
            reminder_sent_at=_normalize_datetime(sent_at or _utc_now().isoformat()),
            cancelled_at=item.cancelled_at,
        )
        self._save(updated)
        return updated


def build_interview_calendar_store(database_url: str = "") -> InterviewCalendarStore | PostgresInterviewCalendarStore:
    if database_url.strip():
        logger.info("Using PostgreSQL interview calendar storage.")
        return PostgresInterviewCalendarStore(database_url)
    if _read_bool("INTERVIEW_CALENDAR_REQUIRE_POSTGRES", False) or _read_bool("SESSION_STORE_REQUIRE_POSTGRES", False):
        raise RuntimeError("DATABASE_URL is required because PostgreSQL interview calendar storage is required.")
    logger.warning("Using local JSON interview calendar storage.")
    return InterviewCalendarStore()


class InterviewReminderService:
    def __init__(self, store: InterviewCalendarStore | PostgresInterviewCalendarStore, settings: SMTPSettings, public_app_url: str = "") -> None:
        self._store = store
        self._settings = settings
        self._public_app_url = _normalize_base_url(public_app_url)
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    @property
    def enabled(self) -> bool:
        return bool(self._settings.host and (self._settings.from_email or self._settings.username))

    def describe(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "minutesBefore": self._settings.reminder_minutes_before,
            "summary": (
                "Interview reminder emails are enabled."
                if self.enabled
                else "Interview reminder emails are disabled until SMTP is configured."
            ),
        }

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="interview-reminder-service", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def _run(self) -> None:
        if not self.enabled:
            logger.info("Interview reminder emails are disabled because SMTP is not configured.")
        while not self._stop_event.wait(max(15, self._settings.poll_interval_seconds)):
            if not self.enabled:
                continue
            try:
                self._process_pending_reminders()
            except Exception:
                logger.exception("Interview reminder scheduler failed.")

    def _process_pending_reminders(self) -> None:
        now = _utc_now()
        for interview in self._store.list():
            if interview.status != "planned" or interview.reminder_sent_at or not interview.candidate_email:
                continue

            scheduled_at = datetime.fromisoformat(interview.scheduled_at.replace("Z", "+00:00"))
            if scheduled_at.tzinfo is None:
                scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)

            reminder_at = scheduled_at - timedelta(minutes=interview.reminder_minutes_before)
            if now < reminder_at or now >= scheduled_at:
                continue

            self._send_email(interview)
            self._store.mark_reminder_sent(interview.id)
            logger.info("Interview reminder sent for %s", interview.id)

    def send_confirmation_email(self, interview: ScheduledInterview) -> None:
        if not self.enabled or not interview.candidate_email:
            return

        message = EmailMessage()
        from_email = self._settings.from_email or self._settings.username
        from_name = self._settings.from_name.strip()
        message["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        message["To"] = interview.candidate_email
        message["Subject"] = "Confirmation entretien"

        cancel_url = build_candidate_cancel_url(self._public_app_url, interview.cancel_token)
        lines = [
            f"Bonjour {interview.candidate_name},",
            "",
            "Votre entretien a bien ete planifie.",
            f"Date et heure : {_format_local_datetime(interview.scheduled_at)}",
        ]
        if cancel_url:
            lines.extend(
                [
                    "",
                    "Si vous devez annuler ce rendez-vous, utilisez ce lien :",
                    cancel_url,
                ]
            )
        lines.extend(["", "Equipe SUBUL RH"])
        message.set_content("\n".join(lines))

        if self._settings.use_ssl:
            with smtplib.SMTP_SSL(self._settings.host, self._settings.port, timeout=20) as smtp:
                self._login_and_send(smtp, message)
            return

        with smtplib.SMTP(self._settings.host, self._settings.port, timeout=20) as smtp:
            if self._settings.use_tls:
                smtp.starttls()
            self._login_and_send(smtp, message)

    def send_cancellation_email(self, interview: ScheduledInterview) -> None:
        if not self.enabled or not interview.candidate_email:
            return

        message = EmailMessage()
        from_email = self._settings.from_email or self._settings.username
        from_name = self._settings.from_name.strip()
        message["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        message["To"] = interview.candidate_email
        message["Subject"] = "Annulation entretien"
        message.set_content(
            "\n".join(
                [
                    f"Bonjour {interview.candidate_name},",
                    "",
                    "Votre entretien planifie a ete annule.",
                    f"Date et heure initialement prevues : {_format_local_datetime(interview.scheduled_at)}",
                    "",
                    "Si vous souhaitez reprogrammer un entretien, merci de reprendre contact avec l'equipe SUBUL RH.",
                    "Equipe SUBUL RH",
                ]
            )
        )

        if self._settings.use_ssl:
            with smtplib.SMTP_SSL(self._settings.host, self._settings.port, timeout=20) as smtp:
                self._login_and_send(smtp, message)
            return

        with smtplib.SMTP(self._settings.host, self._settings.port, timeout=20) as smtp:
            if self._settings.use_tls:
                smtp.starttls()
            self._login_and_send(smtp, message)

    def _send_email(self, interview: ScheduledInterview) -> None:
        message = EmailMessage()
        from_email = self._settings.from_email or self._settings.username
        from_name = self._settings.from_name.strip()
        message["From"] = f"{from_name} <{from_email}>" if from_name else from_email
        message["To"] = interview.candidate_email
        message["Subject"] = "Rappel entretien"
        cancel_url = build_candidate_cancel_url(self._public_app_url, interview.cancel_token)
        lines = [
            f"Bonjour {interview.candidate_name},",
            "",
            "Ceci est un rappel automatique de votre entretien prevu dans 1 heure.",
            f"Date et heure : {_format_local_datetime(interview.scheduled_at)}",
        ]
        if cancel_url:
            lines.extend(
                [
                    "",
                    "Si vous devez annuler ce rendez-vous, utilisez ce lien :",
                    cancel_url,
                ]
            )
        lines.extend(["", "Merci et bonne preparation.", "Equipe SUBUL RH"])
        message.set_content("\n".join(lines))

        if self._settings.use_ssl:
            with smtplib.SMTP_SSL(self._settings.host, self._settings.port, timeout=20) as smtp:
                self._login_and_send(smtp, message)
            return

        with smtplib.SMTP(self._settings.host, self._settings.port, timeout=20) as smtp:
            if self._settings.use_tls:
                smtp.starttls()
            self._login_and_send(smtp, message)

    def _login_and_send(self, smtp: smtplib.SMTP, message: EmailMessage) -> None:
        if self._settings.username:
            smtp.login(self._settings.username, self._settings.password)
        smtp.send_message(message)
