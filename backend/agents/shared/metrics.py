"""
shared/metrics.py — Prometheus metrics for all Subul AI agents.

Usage in each agent's API server:
    from shared.metrics import (
        AgentMetrics, add_metrics_endpoint,
        record_openai_usage, record_openai_error,
        record_search_query, record_cosmos_request,
    )
    metrics = AgentMetrics("cloud-tutor")
    add_metrics_endpoint(app)

All pricing is read from env vars so rates can be updated without rebuilding.
No API keys, prompts, user content, or PII ever enter any label or metric value.
"""

import os
import time
from typing import Optional

from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# ── Pricing constants (loaded once at import time) ──────────────────────────

_GPT4O_IN    = float(os.getenv("COST_AZURE_GPT4O_INPUT_PER_1M",    "2.50"))
_GPT4O_OUT   = float(os.getenv("COST_AZURE_GPT4O_OUTPUT_PER_1M",   "10.00"))
_MINI_IN     = float(os.getenv("COST_AZURE_GPT4OMINI_INPUT_PER_1M", "0.15"))
_MINI_OUT    = float(os.getenv("COST_AZURE_GPT4OMINI_OUTPUT_PER_1M","0.60"))
_EMBED_RATE  = float(os.getenv("COST_AZURE_EMBED_PER_1M",           "0.02"))
_SEARCH_1K   = float(os.getenv("COST_AZURE_SEARCH_PER_1K",          "0.25"))

# ── Prometheus metric declarations (module-level singletons) ─────────────────

_oai_requests = Counter(
    "azure_openai_requests_total",
    "Azure OpenAI API requests",
    ["agent", "deployment", "status"],
)
_oai_prompt_tokens = Counter(
    "azure_openai_prompt_tokens_total",
    "Azure OpenAI prompt tokens consumed",
    ["agent", "deployment"],
)
_oai_completion_tokens = Counter(
    "azure_openai_completion_tokens_total",
    "Azure OpenAI completion tokens consumed",
    ["agent", "deployment"],
)
_oai_total_tokens = Counter(
    "azure_openai_total_tokens_total",
    "Azure OpenAI total tokens consumed",
    ["agent", "deployment"],
)
_oai_cost = Counter(
    "azure_openai_cost_usd_total",
    "Estimated Azure OpenAI cost in USD",
    ["agent", "deployment"],
)
_oai_duration = Histogram(
    "azure_openai_request_duration_seconds",
    "Azure OpenAI request latency in seconds",
    ["agent", "deployment"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)
_search_requests = Counter(
    "azure_search_requests_total",
    "Azure Cognitive Search queries",
    ["agent", "status"],
)
_search_cost = Counter(
    "azure_search_cost_usd_total",
    "Estimated Azure Cognitive Search cost in USD",
    ["agent"],
)
_cosmos_requests = Counter(
    "cosmos_db_requests_total",
    "Cosmos DB requests",
    ["agent", "operation", "status"],
)
_paid_failures = Counter(
    "paid_api_failures_total",
    "Failed paid external API calls",
    ["provider", "agent", "error_type"],
)


def _cost_for_deployment(deployment: str, prompt: int, completion: int) -> float:
    """Estimate cost in USD based on deployment name pattern."""
    d = deployment.lower()
    if "embed" in d or "embedding" in d:
        return (prompt * _EMBED_RATE) / 1_000_000
    if "mini" in d:
        return (prompt * _MINI_IN + completion * _MINI_OUT) / 1_000_000
    # Default: GPT-4o rates
    return (prompt * _GPT4O_IN + completion * _GPT4O_OUT) / 1_000_000


class AgentMetrics:
    """
    Convenience wrapper that binds an agent name to all metric helpers.

    Example:
        metrics = AgentMetrics("cloud-tutor")
        with metrics.openai_timer("gpt-4o-mini") as t:
            response = await oai_client.chat.completions.create(...)
        metrics.record_openai_usage(response.usage, "gpt-4o-mini", t.elapsed)
    """

    def __init__(self, agent_name: str):
        self.agent = agent_name

    # ── Azure OpenAI ────────────────────────────────────────────────────────

    def record_openai_usage(self, usage, deployment: str, duration_s: float) -> None:
        """Record token counts, cost, and duration after a successful OpenAI call."""
        if usage is None:
            return
        prompt     = getattr(usage, "prompt_tokens",     0) or 0
        completion = getattr(usage, "completion_tokens", 0) or 0
        total      = getattr(usage, "total_tokens", prompt + completion)
        cost       = _cost_for_deployment(deployment, prompt, completion)

        _oai_prompt_tokens.labels(    agent=self.agent, deployment=deployment).inc(prompt)
        _oai_completion_tokens.labels(agent=self.agent, deployment=deployment).inc(completion)
        _oai_total_tokens.labels(     agent=self.agent, deployment=deployment).inc(total)
        _oai_cost.labels(             agent=self.agent, deployment=deployment).inc(cost)
        _oai_duration.labels(         agent=self.agent, deployment=deployment).observe(duration_s)
        _oai_requests.labels(         agent=self.agent, deployment=deployment, status="success").inc()

    def record_openai_error(self, deployment: str, error_type: str) -> None:
        """Record a failed OpenAI API call."""
        _oai_requests.labels(agent=self.agent, deployment=deployment, status="error").inc()
        _paid_failures.labels(provider="azure_openai", agent=self.agent, error_type=error_type).inc()

    def record_openai_tokens_estimated(self, text: str, deployment: str, duration_s: float) -> None:
        """Fallback token estimation from response text when usage object is unavailable (streaming)."""
        # Rough estimate: 1 token ≈ 4 chars. Prompt unknown so we skip prompt cost.
        completion_est = max(1, len(text) // 4)
        cost = _cost_for_deployment(deployment, 0, completion_est)
        _oai_completion_tokens.labels(agent=self.agent, deployment=deployment).inc(completion_est)
        _oai_total_tokens.labels(     agent=self.agent, deployment=deployment).inc(completion_est)
        _oai_cost.labels(             agent=self.agent, deployment=deployment).inc(cost)
        _oai_duration.labels(         agent=self.agent, deployment=deployment).observe(duration_s)
        _oai_requests.labels(         agent=self.agent, deployment=deployment, status="success").inc()

    # ── Azure Search ────────────────────────────────────────────────────────

    def record_search_query(self, success: bool) -> None:
        status = "success" if success else "error"
        _search_requests.labels(agent=self.agent, status=status).inc()
        if success:
            _search_cost.labels(agent=self.agent).inc(_SEARCH_1K / 1_000)

    def record_search_error(self, error_type: str = "error") -> None:
        _search_requests.labels(agent=self.agent, status="error").inc()
        _paid_failures.labels(provider="azure_search", agent=self.agent, error_type=error_type).inc()

    # ── Cosmos DB ───────────────────────────────────────────────────────────

    def record_cosmos(self, operation: str, success: bool) -> None:
        """operation: 'read' | 'write' | 'query' | 'delete'"""
        status = "success" if success else "error"
        _cosmos_requests.labels(agent=self.agent, operation=operation, status=status).inc()

    # ── Generic paid-API failure ────────────────────────────────────────────

    def record_failure(self, provider: str, error_type: str) -> None:
        _paid_failures.labels(provider=provider, agent=self.agent, error_type=error_type).inc()


# ── Timing context manager ───────────────────────────────────────────────────

class _Timer:
    """Simple context manager that records wall-clock elapsed seconds."""
    def __init__(self):
        self.elapsed = 0.0
    def __enter__(self):
        self._start = time.perf_counter()
        return self
    def __exit__(self, *_):
        self.elapsed = time.perf_counter() - self._start


def timer() -> _Timer:
    """Use as: with timer() as t: ...; print(t.elapsed)"""
    return _Timer()


# ── FastAPI endpoint helper ──────────────────────────────────────────────────

def add_metrics_endpoint(app) -> None:
    """
    Attach GET /metrics (Prometheus text format) to the given FastAPI app.
    Call this once after the app is created.
    """
    @app.get("/metrics", include_in_schema=False)
    async def prometheus_metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def health_response(service: str, version: str = "1.0.0") -> dict:
    """Standard health check payload."""
    from datetime import datetime, timezone
    return {
        "status": "ok",
        "service": service,
        "version": version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
