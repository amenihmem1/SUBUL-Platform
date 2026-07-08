"""
config.py — Centralized environment configuration for AI agents.

Loads from .env / .env.txt (search: project root, then agents root, then agent dir).
Exposes PORT, CORS_ORIGINS, AZURE_*, COSMOS_* etc. as a single source of truth.
"""

import os
from pathlib import Path
from typing import Optional

# Load dotenv before reading any env vars
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore


def _find_env_file() -> Optional[Path]:
    """Search for .env or .env.txt: project root, then agents dir, then cwd."""
    candidates = []
    # Start from this file's location: shared/config.py -> agents/shared/
    _agents_dir = Path(__file__).resolve().parent.parent
    _project_root = _agents_dir.parent.parent  # backend/agents -> backend -> project root

    candidates.extend([
        _project_root / ".env",
        _project_root / ".env.txt",
        _project_root / "backend" / ".env",
        _project_root / "backend" / ".env.txt",
        _agents_dir / ".env",
        _agents_dir / ".env.txt",
        Path.cwd() / ".env",
        Path.cwd() / ".env.txt",
    ])

    for p in candidates:
        if p.exists():
            return p
    return None


def _load_env():
    """Load .env from first found location."""
    if load_dotenv is None:
        return
    env_path = _find_env_file()
    if env_path:
        load_dotenv(env_path)


_load_env()


class AgentConfig:
    """Central config: env vars with defaults. Agents import get_config()."""

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
    CORS_ORIGINS_LIST: list = []  # Populated on first access

    # Azure OpenAI (with fallbacks for legacy env names)
    AZURE_OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_API_KEY: str = os.getenv("AZURE_OPENAI_API_KEY") or os.getenv("AZURE_OPENAI_KEY", "")
    AZURE_OPENAI_API_VERSION: str = os.getenv("AZURE_OPENAI_API_VERSION") or os.getenv("AZURE_API_VERSION", "2024-12-01-preview")
    AZURE_OPENAI_DEPLOYMENT_NAME: str = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME") or os.getenv("AZURE_DEPLOYMENT_CHAT", "gpt-4o-mini")
    AZURE_DEPLOYMENT_VISION: str = os.getenv("AZURE_DEPLOYMENT_VISION", "gpt-4o")

    # Cosmos DB
    AZURE_COSMOS_ENDPOINT: str = os.getenv("AZURE_COSMOS_ENDPOINT", "")
    AZURE_COSMOS_KEY: str = os.getenv("AZURE_COSMOS_KEY", "")
    AZURE_COSMOS_DATABASE_NAME: str = os.getenv("AZURE_COSMOS_DATABASE_NAME", "EduTech_AI_Production")
    AZURE_COSMOS_CV_CONTAINER_NAME: str = os.getenv("AZURE_COSMOS_CV_CONTAINER_NAME", "AgentCV")

    # Deepgram (TTS/STT)
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")

    # Azure Search (RAG)
    AZURE_SEARCH_ENDPOINT: str = os.getenv("AZURE_SEARCH_ENDPOINT", "")
    AZURE_SEARCH_KEY: str = os.getenv("AZURE_SEARCH_KEY", "")
    AZURE_SEARCH_INDEX_NAME: str = os.getenv("AZURE_SEARCH_INDEX_NAME", "")

    @classmethod
    def get_cors_origins(cls) -> list:
        if not cls.CORS_ORIGINS_LIST:
            raw = cls.CORS_ORIGINS.strip()
            cls.CORS_ORIGINS_LIST = [o.strip() for o in raw.split(",") if o.strip()]
            if not cls.CORS_ORIGINS_LIST:
                cls.CORS_ORIGINS_LIST = ["*"]
        return cls.CORS_ORIGINS_LIST


_config_instance: Optional[AgentConfig] = None


def get_config() -> AgentConfig:
    global _config_instance
    if _config_instance is None:
        _config_instance = AgentConfig()
    return _config_instance
