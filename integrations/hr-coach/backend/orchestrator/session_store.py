from abc import ABC, abstractmethod
from datetime import datetime
import json
import logging
from pathlib import Path
import time
from typing import Any
from uuid import uuid4

from core.paths import SESSIONS_DIR, ensure_data_dirs, sanitize_storage_name

logger = logging.getLogger(__name__)
SESSION_SCHEMA_VERSION = 2


def _dict_or_empty(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _list_or_empty(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _numeric_value(payload: dict[str, Any], key: str) -> float:
    value = payload.get(key, 0)
    return float(value) if isinstance(value, (int, float)) else 0.0


def _merge_counter_dicts(existing: dict[str, Any], incoming: dict[str, Any], key: str) -> None:
    merged: dict[str, Any] = {}
    for source in (_dict_or_empty(existing.get(key)), _dict_or_empty(incoming.get(key))):
        for item_key, item_value in source.items():
            if isinstance(item_value, (int, float)):
                merged[str(item_key)] = max(float(merged.get(str(item_key), 0.0) or 0.0), float(item_value))
            elif str(item_key) not in merged:
                merged[str(item_key)] = item_value
    if merged:
        incoming[key] = merged


def _choose_richer_observations(existing: Any, incoming: Any, *, sample_key: str) -> dict[str, Any]:
    existing_payload = _dict_or_empty(existing)
    incoming_payload = _dict_or_empty(incoming)
    if not existing_payload:
        return incoming_payload
    if not incoming_payload:
        return existing_payload

    existing_samples = _numeric_value(existing_payload, sample_key)
    incoming_samples = _numeric_value(incoming_payload, sample_key)
    if existing_samples > incoming_samples:
        richer = dict(existing_payload)
        other = incoming_payload
    else:
        richer = dict(incoming_payload)
        other = existing_payload

    # Preserve counters that can be appended by a different service instance
    # between two saves. The richer payload remains authoritative for totals.
    for key in (
        "object_counts",
        "object_confidence_totals",
        "expressions",
        "postures",
        "energy_labels",
        "pace_labels",
        "hesitation_labels",
    ):
        _merge_counter_dicts(other, richer, key)
    return richer


def _merge_proctoring_events(existing: Any, incoming: Any) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for event in [*_list_or_empty(existing), *_list_or_empty(incoming)]:
        if not isinstance(event, dict):
            continue
        key = "|".join(
            str(event.get(item, "") or "").strip()
            for item in ("time", "type", "reason", "message")
        )
        if key in seen:
            continue
        seen.add(key)
        merged.append(dict(event))
    return merged[-500:]


def _turn_key(turn: dict[str, Any]) -> str:
    return "|".join(
        str(turn.get(item, "") or "").strip()
        for item in ("time", "phase", "question_index", "candidate_text", "say")
    )


def _turn_identity(turn: dict[str, Any]) -> str:
    phase = str(turn.get("phase", "") or "").strip().upper()
    try:
        question_index = int(turn.get("question_index", 0) or 0)
    except Exception:
        question_index = 0
    if phase and question_index:
        return f"{phase}:{question_index}"
    return _turn_key(turn)


def _merge_turns(existing: Any, incoming: Any) -> list[dict[str, Any]]:
    existing_turns = [dict(turn) for turn in _list_or_empty(existing) if isinstance(turn, dict)]
    incoming_turns = [dict(turn) for turn in _list_or_empty(incoming) if isinstance(turn, dict)]
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for turn in [*existing_turns, *incoming_turns]:
        key = _turn_identity(turn)
        if key in seen:
            continue
        seen.add(key)
        merged.append(turn)

    def sort_key(turn: dict[str, Any]) -> tuple[str, int]:
        return (
            str(turn.get("time", "") or ""),
            int(turn.get("question_index", 0) or 0) if str(turn.get("question_index", "")).isdigit() else 0,
        )

    return sorted(merged, key=sort_key)


def _merge_final_report(existing: Any, incoming: Any, merged_events: list[dict[str, Any]]) -> Any:
    existing_report = _dict_or_empty(existing)
    incoming_report = _dict_or_empty(incoming)
    if not existing_report:
        report = dict(incoming_report) if incoming_report else incoming
    elif not incoming_report:
        report = dict(existing_report)
    else:
        report = dict(incoming_report)
        for key in ("visual_metrics", "audio_metrics"):
            existing_metrics = _dict_or_empty(existing_report.get(key))
            incoming_metrics = _dict_or_empty(report.get(key))
            if existing_metrics and not incoming_metrics:
                report[key] = existing_metrics
        for key in ("visual_signals", "visual_flags", "audio_signals", "audio_flags"):
            if _list_or_empty(existing_report.get(key)) and not _list_or_empty(report.get(key)):
                report[key] = list(existing_report[key])
    if isinstance(report, dict):
        report["proctoring_events"] = merged_events
        report["proctoring_alerts_count"] = len(merged_events)
    return report


def merge_session_payload(existing: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged = dict(incoming)

    for key in (
        "cv_profile",
        "response_language",
        "interview_status",
        "finalized_at",
        "finalized_by",
        "preferred_input_mode",
    ):
        if existing.get(key) and not merged.get(key):
            merged[key] = existing[key]

    if existing.get("cv_uploaded") and "cv_uploaded" not in merged:
        merged["cv_uploaded"] = True

    existing_history_meta = existing.get("history_meta")
    incoming_history_meta = merged.get("history_meta")
    if isinstance(existing_history_meta, dict) and not isinstance(incoming_history_meta, dict):
        merged["history_meta"] = dict(existing_history_meta)

    merged["turns"] = _merge_turns(existing.get("turns"), merged.get("turns"))
    try:
        merged["last_question_index"] = max(
            int(existing.get("last_question_index", 0) or 0),
            int(merged.get("last_question_index", 0) or 0),
        )
    except Exception:
        pass
    try:
        merged["interview_max_questions"] = max(
            int(existing.get("interview_max_questions", 4) or 4),
            int(merged.get("interview_max_questions", 4) or 4),
        )
    except Exception:
        pass

    merged["visual_observations"] = _choose_richer_observations(
        existing.get("visual_observations"),
        merged.get("visual_observations"),
        sample_key="sample_count",
    )
    merged["audio_observations"] = _choose_richer_observations(
        existing.get("audio_observations"),
        merged.get("audio_observations"),
        sample_key="utterance_count",
    )
    merged_events = _merge_proctoring_events(existing.get("proctoring_events"), merged.get("proctoring_events"))
    merged["proctoring_events"] = merged_events
    merged["final_report"] = _merge_final_report(existing.get("final_report"), merged.get("final_report"), merged_events)
    if existing.get("cached_insights") and not merged.get("cached_insights"):
        merged["cached_insights"] = existing["cached_insights"]
    return merged


class SessionStore(ABC):
    @abstractmethod
    def load(self, session_id: str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def save(self, session_id: str, payload: dict[str, Any]) -> None:
        raise NotImplementedError

    @abstractmethod
    def list_payloads(self, limit: int = 100) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def delete(self, session_id: str) -> bool:
        raise NotImplementedError


class JsonSessionStore(SessionStore):
    def __init__(self, base_dir: str | Path = SESSIONS_DIR):
        ensure_data_dirs()
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _safe_session_id(self, session_id: str) -> str:
        return sanitize_storage_name(session_id)

    def _path(self, session_id: str) -> Path:
        return self.base_dir / f"{self._safe_session_id(session_id)}.json"

    def _quarantine_corrupted_file(self, path: Path, reason: Exception) -> None:
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        quarantine_path = path.with_suffix(f".corrupt-{timestamp}.json")
        try:
            path.rename(quarantine_path)
            logger.warning(
                "Corrupted session payload moved to quarantine: original=%s quarantine=%s error=%s",
                path,
                quarantine_path,
                reason,
            )
        except Exception:
            logger.warning(
                "Unable to quarantine corrupted session payload: path=%s error=%s",
                path,
                reason,
                exc_info=True,
            )

    def _load_path(self, path: Path) -> dict[str, Any] | None:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                break
            except Exception as exc:
                last_error = exc
                if attempt < 2:
                    time.sleep(0.05)
        else:
            self._quarantine_corrupted_file(path, last_error or RuntimeError("Invalid JSON payload"))
            return None
        if not isinstance(payload, dict):
            logger.warning("Ignoring non-dict session payload at %s", path)
            return None
        return payload

    def load(self, session_id: str) -> dict[str, Any] | None:
        path = self._path(session_id)
        if not path.exists():
            return None
        payload = self._load_path(path)
        if payload is None:
            return None
        payload.setdefault("schema_version", SESSION_SCHEMA_VERSION)
        payload.setdefault("session_id", path.stem)
        return payload

    def save(self, session_id: str, payload: dict[str, Any]) -> None:
        existing = self.load(session_id) or {}
        payload_with_meta = merge_session_payload(existing, payload)
        payload_with_meta["updated_at"] = datetime.utcnow().isoformat() + "Z"
        payload_with_meta["schema_version"] = SESSION_SCHEMA_VERSION
        payload_with_meta.setdefault("session_id", session_id)
        serialized = json.dumps(payload_with_meta, ensure_ascii=True, indent=2)
        path = self._path(session_id)
        temp_path = path.with_name(f".{path.name}.{uuid4().hex}.tmp")
        temp_path.write_text(serialized, encoding="utf-8")
        temp_path.replace(path)

    def list_payloads(self, limit: int = 100) -> list[dict[str, Any]]:
        payloads: list[dict[str, Any]] = []
        for path in sorted(self.base_dir.glob("*.json"), key=lambda item: item.stat().st_mtime, reverse=True):
            if len(payloads) >= max(1, limit):
                break
            payload = self._load_path(path)
            if payload is None:
                continue
            payload.setdefault("schema_version", SESSION_SCHEMA_VERSION)
            payload.setdefault("session_id", path.stem)
            payloads.append(payload)

        payloads.sort(key=lambda item: str(item.get("updated_at", "") or ""), reverse=True)
        return payloads[: max(1, limit)]

    def delete(self, session_id: str) -> bool:
        target_paths = {self._path(session_id)}
        for path in self.base_dir.glob("*.json"):
            if path in target_paths:
                continue
            payload = self._load_path(path)
            if payload is None:
                continue
            if str(payload.get("session_id") or "").strip() == session_id:
                target_paths.add(path)

        deleted = False
        for path in target_paths:
            if not path.exists():
                continue
            try:
                path.unlink()
                deleted = True
            except Exception:
                logger.warning("Unable to delete session payload at %s", path, exc_info=True)
        return deleted


class PostgresSessionStore(SessionStore):
    def __init__(self, database_url: str):
        self.database_url = database_url
        try:
            import psycopg  # type: ignore
        except Exception as exc:
            raise RuntimeError(f"psycopg is required for PostgresSessionStore: {exc}") from exc
        self._psycopg = psycopg
        self._init_schema()

    def _connect(self):
        return self._psycopg.connect(self.database_url, connect_timeout=5)

    def _init_schema(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS interview_sessions (
                        session_id TEXT PRIMARY KEY,
                        payload JSONB NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
            conn.commit()

    def load(self, session_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT payload FROM interview_sessions WHERE session_id = %s",
                    (session_id,),
                )
                row = cur.fetchone()
        if not row:
            return None
        return row[0]

    def save(self, session_id: str, payload: dict[str, Any]) -> None:
        existing = self.load(session_id) or {}
        normalized_payload = merge_session_payload(existing, payload)
        normalized_payload["schema_version"] = SESSION_SCHEMA_VERSION
        normalized_payload.setdefault("session_id", session_id)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO interview_sessions (session_id, payload, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (session_id)
                    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
                    """,
                    (
                        session_id,
                        self._psycopg.types.json.Jsonb(
                            {
                                **normalized_payload,
                                "updated_at": datetime.utcnow().isoformat() + "Z",
                            }
                        ),
                    ),
                )
            conn.commit()

    def list_payloads(self, limit: int = 100) -> list[dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT payload
                    FROM interview_sessions
                    ORDER BY updated_at DESC
                    LIMIT %s
                    """,
                    (max(1, limit),),
                )
                rows = cur.fetchall()

        payloads: list[dict[str, Any]] = []
        for row in rows:
            payload = row[0] if row else None
            if isinstance(payload, dict):
                payloads.append(payload)
        return payloads

    def delete(self, session_id: str) -> bool:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM interview_sessions WHERE session_id = %s", (session_id,))
                deleted = cur.rowcount > 0
            conn.commit()
        return deleted
