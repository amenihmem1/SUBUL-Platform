from __future__ import annotations

import os

from core.paths import ensure_data_dirs
from orchestrator.session_store import JsonSessionStore, PostgresSessionStore, SessionStore


def _read_bool_env(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def build_session_store(database_url: str) -> SessionStore:
    ensure_data_dirs()
    if database_url:
        return PostgresSessionStore(database_url)
    if _read_bool_env("SESSION_STORE_REQUIRE_POSTGRES"):
        raise RuntimeError("DATABASE_URL is required because SESSION_STORE_REQUIRE_POSTGRES=true.")
    return JsonSessionStore()


def build_resilient_session_store(database_url: str, *, service_name: str = "Session") -> SessionStore:
    try:
        return build_session_store(database_url)
    except Exception as exc:
        allow_json_fallback = _read_bool_env("SESSION_STORE_ALLOW_JSON_FALLBACK")
        if (database_url or _read_bool_env("SESSION_STORE_REQUIRE_POSTGRES")) and not allow_json_fallback:
            raise RuntimeError(f"[{service_name}Store] PostgreSQL unavailable and JSON fallback is disabled: {exc}") from exc
        print(f"[{service_name}Store] PostgreSQL unavailable, fallback JSON store: {exc}")
        return build_session_store("")
