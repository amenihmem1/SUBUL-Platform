"""
fastapi_base.py — Factory for consistent FastAPI app setup across agents.

create_agent_app(title, version, port) returns a FastAPI app with:
  - CORS from config (CORS_ORIGINS)
  - Request-ID middleware (X-Request-Id for correlation)
  - Standard metadata

Optional warmup_rag(search_manager) helper for RAG warm-up.
"""

import uuid
from typing import Callable, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from shared.config import get_config
from shared.logging import set_request_id


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Set request_id from X-Request-Id header or generate one; expose in response for correlation."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        set_request_id(request_id)
        try:
            response = await call_next(request)
            response.headers["x-request-id"] = request_id
            return response
        finally:
            set_request_id(None)


def create_agent_app(
    title: str,
    version: str,
    port: int,
    description: str = "",
    lifespan: Optional[Callable] = None,
) -> FastAPI:
    """
    Create a FastAPI app with CORS from config and standard metadata.
    If lifespan is None, caller can use @app.on_event or add lifespan later.
    """
    config = get_config()
    origins = config.get_cors_origins()

    app = FastAPI(title=title, version=version, description=description, lifespan=lifespan)

    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app


async def warmup_rag(search_manager: Any, query: str = "warmup test réseau") -> None:
    """
    Warm up RAG search to avoid first-call latency.
    Logs success/failure; does not raise.
    """
    import logging
    logger = logging.getLogger("shared.fastapi_base")
    try:
        await search_manager.search(query)
        logger.info("Réseau débouché et prêt (IPv4)")
    except Exception as e:
        logger.warning("Warm-up a échoué, mais l'API continue : %s", e)
