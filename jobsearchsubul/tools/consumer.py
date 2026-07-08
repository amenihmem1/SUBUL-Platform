"""
Kafka consumer for job events (optional). If KAFKA_BOOTSTRAP_SERVERS is unset, runs an idle loop
so the pod stays healthy until Kafka is wired.
"""
from __future__ import annotations

import json
import logging
import os
import signal
import sys
import time

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
log = logging.getLogger(__name__)

_stop = False


def _handle_sigterm(*_: object) -> None:
    global _stop
    _stop = True


def main() -> int:
    signal.signal(signal.SIGTERM, _handle_sigterm)
    brokers = (os.getenv("KAFKA_BOOTSTRAP_SERVERS") or "").strip()
    topic = (os.getenv("KAFKA_JOBS_TOPIC") or "job-raw").strip()
    group = (os.getenv("KAFKA_CONSUMER_GROUP") or "job-consumer-subul").strip()

    if not brokers:
        log.warning(
            "KAFKA_BOOTSTRAP_SERVERS not set — consumer idle (set env to enable Kafka). "
            "Sleeping; send SIGTERM to exit.",
        )
        while not _stop:
            time.sleep(60)
        return 0

    try:
        from kafka import KafkaConsumer
    except ImportError:
        log.error("kafka-python not installed")
        return 1

    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=[b.strip() for b in brokers.split(",") if b.strip()],
        group_id=group,
        value_deserializer=lambda b: json.loads(b.decode("utf-8")),
        consumer_timeout_ms=5000,
        auto_offset_reset="earliest",
    )
    log.info("Consuming topic=%s group=%s", topic, group)
    try:
        while not _stop:
            for msg in consumer:
                if _stop:
                    break
                log.info("job event: %s", msg.value.get("title", "")[:120] if isinstance(msg.value, dict) else msg.value)
    finally:
        consumer.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
