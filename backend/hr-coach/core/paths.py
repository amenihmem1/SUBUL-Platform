from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
REPORTS_DIR = DATA_DIR / "reports"
INTERVIEWS_DIR = DATA_DIR / "interviews"
ROOT_ENV_FILE = PROJECT_DIR / ".env"
BACKEND_ENV_FILE = BACKEND_DIR / ".env"


def sanitize_storage_name(value: str, fallback: str = "session") -> str:
    safe = "".join(ch if ch.isalnum() or ch in ("_", "-") else "_" for ch in value).strip("_")
    return safe or fallback


def ensure_data_dirs() -> None:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    INTERVIEWS_DIR.mkdir(parents=True, exist_ok=True)
