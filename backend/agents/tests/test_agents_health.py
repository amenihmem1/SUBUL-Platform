"""
test_agents_health.py — Health check tests for AI agents.

Run when agents are up (Docker or local):
  pytest backend/agents/tests/test_agents_health.py -v

Or with base URL override:
  AGENT_BASE_URL=http://localhost pytest backend/agents/tests/test_agents_health.py -v
"""

import os
import pytest
import httpx

BASE = os.getenv("AGENT_BASE_URL", "http://localhost").rstrip("/")
TIMEOUT = 5.0

HEALTH_ENDPOINTS = [
    ("Quiz", 8001, f"{BASE}:8001/api/quiz/health"),
    ("Roadmap", 8002, f"{BASE}:8002/api/roadmap/health"),
    ("CV Booster", 8003, f"{BASE}:8003/api/cv/health"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("name,port,url", HEALTH_ENDPOINTS)
async def test_agent_health(name: str, port: int, url: str):
    """Each agent's health endpoint returns 200 and status=ok."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(url)
            assert resp.status_code == 200, f"{name} health returned {resp.status_code}"
            data = resp.json()
            assert data.get("status") == "ok", f"{name} health missing status=ok: {data}"
        except httpx.ConnectError as e:
            pytest.skip(f"{name} agent not running on port {port} (start with uvicorn): {e}")
