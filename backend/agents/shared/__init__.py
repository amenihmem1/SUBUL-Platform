"""
shared — Shared infrastructure for AI agents (Quiz, Roadmap, CV Booster, Coach, JobSearch, 03_Agents).

Exports:
  - get_config: AgentConfig
  - get_logger: (name: str) -> logging.Logger
  - create_agent_app: (title, version, port) -> FastAPI
"""

from shared.config import get_config
from shared.logging import get_logger
from shared.fastapi_base import create_agent_app

__all__ = ["get_config", "get_logger", "create_agent_app"]
