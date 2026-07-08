from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from core.paths import BACKEND_DIR, BACKEND_ENV_FILE, PROJECT_DIR, ROOT_ENV_FILE


def _read_str(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _read_int(name: str, default: int) -> int:
    return int(_read_str(name, str(default)))


def _read_float(name: str, default: float) -> float:
    return float(_read_str(name, str(default)))


def _read_first(names: tuple[str, ...], default: str = "") -> str:
    for name in names:
        raw = os.getenv(name)
        if raw is not None and raw.strip():
            return raw.strip()
    return default.strip()


def _read_csv(name: str) -> list[str]:
    raw = os.getenv(name, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _read_int_first(names: tuple[str, ...], default: int) -> int:
    return int(_read_first(names, str(default)))


def _read_float_first(names: tuple[str, ...], default: float) -> float:
    return float(_read_first(names, str(default)))


def _read_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True, slots=True)
class LLMSettings:
    api_key: str
    base_url: str
    model: str
    max_tokens: int
    temperature: float
    api_version: str
    provider: str


@dataclass(frozen=True, slots=True)
class CartesiaSettings:
    api_key: str
    model: str
    voice_id: str
    language: str
    mode: str
    verbose: bool


@dataclass(frozen=True, slots=True)
class STTSettings:
    api_key: str
    language: str
    model: str
    mic_index: int | None
    endpointing_ms: int
    utterance_end_ms: int
    merge_window_s: float
    continuation_window_s: float
    request_timeout_s: float
    connect_timeout_s: float
    read_timeout_s: float
    write_timeout_s: float
    max_attempts: int
    retry_backoff_s: float


@dataclass(frozen=True, slots=True)
class EmotionSettings:
    provider: str
    custom_model_dir: Path | None


@dataclass(frozen=True, slots=True)
class AzureSearchSettings:
    endpoint: str
    api_key: str
    index: str
    api_version: str
    enabled: bool


@dataclass(frozen=True, slots=True)
class AzureStorageSettings:
    connection_string: str
    account_name: str
    account_key: str
    container: str
    cv_container: str
    course_pdfs_container: str
    reports_container: str
    audio_container: str
    video_container: str
    enabled: bool


@dataclass(frozen=True, slots=True)
class SMTPSettings:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool
    reminder_minutes_before: int
    poll_interval_seconds: int


@dataclass(frozen=True, slots=True)
class AppSettings:
    llm_backend: str
    llm: LLMSettings
    cartesia: CartesiaSettings
    stt: STTSettings
    emotion: EmotionSettings
    azure_search: AzureSearchSettings
    azure_storage: AzureStorageSettings
    smtp: SMTPSettings
    public_app_url: str
    cors_allow_origins: list[str]
    database_url: str
    session_id: str
    candidate_cv_path: Path | None


def load_backend_env() -> None:
    if ROOT_ENV_FILE.exists():
        load_dotenv(ROOT_ENV_FILE, override=True)
    if BACKEND_ENV_FILE.exists():
        load_dotenv(BACKEND_ENV_FILE, override=True)


def _resolve_optional_path(raw_value: str) -> Path | None:
    if not raw_value:
        return None
    candidate = Path(raw_value).expanduser()
    return candidate if candidate.is_absolute() else (PROJECT_DIR / candidate)


def _discover_default_custom_emotion_model_dir() -> Path | None:
    for emotion_models_dir in (
        BACKEND_DIR / "data" / "models" / "emotion",
        PROJECT_DIR / "backend" / "data" / "models" / "emotion",
    ):
        if not emotion_models_dir.exists():
            continue
        candidates = sorted(
            [path for path in emotion_models_dir.iterdir() if path.is_dir()],
            key=lambda path: path.name,
            reverse=True,
        )
        if candidates:
            return candidates[0]
    return None


def load_settings() -> AppSettings:
    load_backend_env()

    candidate_cv_raw = _read_str("CANDIDATE_CV_PATH")
    candidate_cv_path: Path | None = None
    if candidate_cv_raw:
        raw_path = Path(candidate_cv_raw).expanduser()
        candidate_cv_path = raw_path if raw_path.is_absolute() else (PROJECT_DIR / raw_path)

    mic_index_raw = _read_str("MIC_DEVICE_INDEX")
    mic_index = int(mic_index_raw) if mic_index_raw else None
    custom_model_dir = _resolve_optional_path(_read_str("CUSTOM_EMOTION_MODEL_DIR")) or _discover_default_custom_emotion_model_dir()
    configured_provider = _read_str("EMOTION_BACKEND_PROVIDER", "").lower()
    emotion_provider = "custom" if custom_model_dir is not None else "none"
    if configured_provider and configured_provider not in {"custom", "none"}:
        print(f"[Emotion] Ignoring unsupported provider '{configured_provider}'. Custom-only mode is enforced.")
    azure_endpoint = _read_str("AZURE_OPENAI_ENDPOINT")
    azure_deployment = _read_str("AZURE_OPENAI_DEPLOYMENT")
    azure_api_key = _read_str("AZURE_OPENAI_API_KEY")
    azure_api_version = _read_str("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    llm_provider = _read_str("LLM_PROVIDER").lower()
    if not llm_provider and (azure_endpoint or azure_deployment or azure_api_key):
        llm_provider = "azure_openai"
    if not llm_provider:
        llm_provider = "openai_compatible"
    public_app_url = _read_first(("APP_PUBLIC_URL", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"))
    cors_allow_origins = list(
        dict.fromkeys(
            [
                *_read_csv("CORS_ALLOW_ORIGINS"),
                public_app_url,
                "https://rh-frontend.azurewebsites.net",
            ]
        )
    )

    return AppSettings(
        llm_backend=_read_str("LLM_BACKEND", "langchain").lower(),
        llm=LLMSettings(
            api_key=_read_first(("LLM_API_KEY", "LANGCHAIN_API_KEY", "OPENAI_API_KEY", "AZURE_OPENAI_API_KEY")),
            base_url=_read_first(
                ("LLM_BASE_URL", "LANGCHAIN_BASE_URL", "OPENAI_BASE_URL", "AZURE_OPENAI_ENDPOINT"),
                "https://api.openai.com/v1",
            ),
            model=_read_first(
                ("LLM_MODEL", "LANGCHAIN_MODEL", "OPENAI_MODEL", "AZURE_OPENAI_DEPLOYMENT"),
                "gpt-4o-mini",
            ),
            max_tokens=_read_int_first(
                ("LLM_MAX_TOKENS", "LANGCHAIN_MAX_TOKENS"),
                320,
            ),
            temperature=_read_float_first(
                ("LLM_TEMPERATURE", "LANGCHAIN_TEMPERATURE"),
                0.7,
            ),
            api_version=_read_first(("LLM_API_VERSION", "AZURE_OPENAI_API_VERSION"), azure_api_version),
            provider=llm_provider,
        ),
        cartesia=CartesiaSettings(
            api_key=_read_str("CARTESIA_API_KEY"),
            model=_read_str("CARTESIA_MODEL", _read_str("TTS_MODEL", "sonic")),
            voice_id=_read_str("CARTESIA_VOICE_ID", "694f9389-aac1-45b6-b726-9d9369183238"),
            language=_read_str("CARTESIA_LANGUAGE", "fr"),
            mode=_read_str("TTS_MODE", "tts").lower(),
            verbose=_read_bool("TTS_VERBOSE", True),
        ),
        stt=STTSettings(
            api_key=_read_str("DEEPGRAM_API_KEY"),
            language=_read_str("STT_LANGUAGE", "fr"),
            model=_read_str("STT_MODEL", "nova-3"),
            mic_index=mic_index,
            endpointing_ms=_read_int("STT_ENDPOINTING_MS", 1400),
            utterance_end_ms=_read_int("STT_UTTERANCE_END_MS", 3200),
            merge_window_s=_read_float("STT_MERGE_WINDOW_S", 0.35),
            continuation_window_s=_read_float("STT_CONTINUATION_WINDOW_S", 1.8),
            request_timeout_s=_read_float("STT_REQUEST_TIMEOUT_S", 90.0),
            connect_timeout_s=_read_float("STT_CONNECT_TIMEOUT_S", 15.0),
            read_timeout_s=_read_float("STT_READ_TIMEOUT_S", 90.0),
            write_timeout_s=_read_float("STT_WRITE_TIMEOUT_S", 90.0),
            max_attempts=max(1, _read_int("STT_MAX_ATTEMPTS", 2)),
            retry_backoff_s=max(0.0, _read_float("STT_RETRY_BACKOFF_S", 1.25)),
        ),
        emotion=EmotionSettings(
            provider=emotion_provider,
            custom_model_dir=custom_model_dir,
        ),
        azure_search=AzureSearchSettings(
            endpoint=_read_str("AZURE_SEARCH_ENDPOINT"),
            api_key=_read_str("AZURE_SEARCH_KEY"),
            index=_read_str("AZURE_SEARCH_INDEX"),
            api_version=_read_str("AZURE_SEARCH_API_VERSION", "2024-07-01"),
            enabled=_read_bool("AZURE_SEARCH_ENABLED", True),
        ),
        azure_storage=AzureStorageSettings(
            connection_string=_read_str("AZURE_STORAGE_CONNECTION_STRING"),
            account_name=_read_str("AZURE_STORAGE_ACCOUNT_NAME"),
            account_key=_read_str("AZURE_STORAGE_ACCOUNT_KEY"),
            container=_read_str("AZURE_STORAGE_CONTAINER", "cv-files"),
            cv_container=_read_first(("AZURE_STORAGE_CV_CONTAINER", "AZURE_STORAGE_CONTAINER"), "cv-files"),
            course_pdfs_container=_read_str("AZURE_STORAGE_COURSE_PDFS_CONTAINER", "course-pdfs"),
            reports_container=_read_str("AZURE_STORAGE_REPORTS_CONTAINER", "reports"),
            audio_container=_read_str("AZURE_STORAGE_AUDIO_CONTAINER", "audio-files"),
            video_container=_read_str("AZURE_STORAGE_VIDEO_CONTAINER", "video-files"),
            enabled=_read_bool("AZURE_STORAGE_ENABLED", True),
        ),
        smtp=SMTPSettings(
            host=_read_str("SMTP_HOST"),
            port=max(1, _read_int("SMTP_PORT", 587)),
            username=_read_str("SMTP_USERNAME"),
            password=_read_str("SMTP_PASSWORD"),
            from_email=_read_str("SMTP_FROM_EMAIL"),
            from_name=_read_str("SMTP_FROM_NAME", "SUBUL RH"),
            use_tls=_read_bool("SMTP_USE_TLS", True),
            use_ssl=_read_bool("SMTP_USE_SSL", False),
            reminder_minutes_before=max(1, _read_int("INTERVIEW_REMINDER_MINUTES_BEFORE", 60)),
            poll_interval_seconds=max(15, _read_int("INTERVIEW_REMINDER_POLL_INTERVAL_S", 30)),
        ),
        public_app_url=public_app_url,
        cors_allow_origins=[origin for origin in cors_allow_origins if origin],
        database_url=_read_str("DATABASE_URL"),
        session_id=_read_str("SESSION_ID"),
        candidate_cv_path=candidate_cv_path,
    )
