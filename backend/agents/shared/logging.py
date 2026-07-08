"""
logging.py — Structured logging for AI agents.

get_logger(name) returns a Logger with consistent format:
  %(asctime)s | %(levelname)s | %(name)s | %(request_id)s | %(message)s

Request ID is set by shared middleware (X-Request-Id or generated) for correlation.
No print() in production code; use logger.info(), logger.error(), etc.
"""

import logging
import sys
from contextvars import ContextVar
from typing import Optional

# Request ID for correlation across API and agents (set by middleware)
_request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def get_request_id() -> Optional[str]:
    """Return the current request ID if set (by request_id middleware)."""
    return _request_id_var.get()


def set_request_id(value: Optional[str]) -> None:
    """Set the current request ID (used by middleware)."""
    _request_id_var.set(value)

_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(request_id)s | %(message)s"
_DATE_FMT = "%Y-%m-%d %H:%M:%S"

_root_configured = False


class RequestIdFilter(logging.Filter):
    """Add request_id to each log record from context."""

    def filter(self, record: logging.LogRecord) -> bool:
        rid = _request_id_var.get()
        setattr(record, "request_id", rid if rid else "-")
        return True


def _ensure_root_config():
    global _root_configured
    if _root_configured:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(RequestIdFilter())
    handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATE_FMT))
    root = logging.getLogger()
    if not root.handlers:
        root.addHandler(handler)
        root.setLevel(logging.INFO)
    _root_configured = True


def get_logger(name: str, level: Optional[int] = None) -> logging.Logger:
    """Return a logger with consistent format. Use module or agent name, e.g. 'quiz_api', 'coach_api'."""
    _ensure_root_config()
    logger = logging.getLogger(name)
    if level is not None:
        logger.setLevel(level)
    return logger
