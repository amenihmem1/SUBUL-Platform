"""Kafka producer for scraped job payloads (optional — no-op if Kafka is not configured)."""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

log = logging.getLogger(__name__)


def send_to_kafka(job: Dict[str, Any]) -> None:
    brokers = (os.getenv("KAFKA_BOOTSTRAP_SERVERS") or "").strip()
    topic = (os.getenv("KAFKA_JOBS_TOPIC") or "job-raw").strip()
    if not brokers:
        log.debug("KAFKA_BOOTSTRAP_SERVERS unset; skip Kafka for %s", job.get("title", "")[:80])
        return
    try:
        from kafka import KafkaProducer

        producer = KafkaProducer(
            bootstrap_servers=[b.strip() for b in brokers.split(",") if b.strip()],
            value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
            request_timeout_ms=30_000,
        )
        producer.send(topic, value=job)
        producer.flush(timeout=15)
        producer.close()
    except Exception as exc:
        log.warning("Kafka send failed: %s", exc)
