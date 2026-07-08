"""
Prefect deployment bootstrap — called by prefect-agent init container command in K8s.
Extend this when you add real Prefect flows; by default it succeeds so the agent can start.
"""
from __future__ import annotations

import logging
import os
import sys

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger(__name__)


def main() -> int:
    api = (os.getenv("PREFECT_API_URL") or "").strip()
    if not api:
        log.info("PREFECT_API_URL not set; skipping deployment bootstrap")
        return 0
    log.info("Prefect deployment bootstrap (placeholder). API=%s", api)
    # Example when flows exist:
    # from prefect.deployments import Deployment
    # ...
    return 0


if __name__ == "__main__":
    sys.exit(main())
