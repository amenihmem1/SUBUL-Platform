# Grafana Monitoring Stack — Implementation Plan

## Overview

Full observability stack for Subul Platform:
- **Uptime / health** — Blackbox Exporter HTTP/TCP probes for every service
- **AI/API consumption & cost** — custom Prometheus counters tracking tokens, audio seconds, characters, and estimated USD cost per provider per agent, with no secrets or PII in any label
- **Infrastructure** — Node Exporter (host), cAdvisor (containers), postgres-exporter, redis-exporter
- **Logs** — Loki + Promtail (Docker container log scraping)
- **Alerting** — Alertmanager with email; alert rules for downtime, high latency, cost thresholds, failure spikes
- **Visualization** — Grafana with 6 pre-provisioned dashboards

Deployed as a separate `monitoring/docker-compose.monitoring.yml` that joins the existing `subul-network`. Zero changes to `docker-compose.yml`.

---

## 1. Current Health Endpoint Audit

| Agent | Port | Existing health path | Action needed |
|---|---|---|---|
| agent-cloud-tutor | 8000 | ❌ none | Add `GET /health` to `03_Agents/api_server.py` |
| agent-quiz | 8001 | ✅ `GET /api/quiz/health` | None |
| agent-roadmap | 8002 | ✅ `GET /api/roadmap/health` | None |
| agent-coach | 8004 | ✅ `GET /api/coach/health` | None |
| agent-cv-booster | 8005 | ⚠️ `GET /api/cv/` (not standard) | Add `GET /health` to `enhance_cv.py` |
| agent-job-search | 8006 | ⚠️ `GET /docs` (Swagger) | Add `GET /health` to `main.py` |
| NestJS API | 3001 | ✅ `/api/health` | Add Prometheus `/metrics` endpoint |
| PostgreSQL | 5432 | N/A — scraped via exporter sidecar | Add `postgres-exporter` service |
| Redis | 6379 | N/A — scraped via exporter sidecar | Add `redis-exporter` service |

---

## 2. AI/API Consumption & Cost Monitoring — Architecture

### Data flow per provider

| Provider | Where called | How metrics are captured |
|---|---|---|
| **Azure OpenAI** (chat + embeddings) | Inside each Python agent | Python agent wraps every OpenAI call; records tokens + cost to `prometheus_client` counters; exposes `GET /metrics` |
| **Azure Cognitive Search** | Inside Python agents | Same — wrap each search call, count queries + estimated cost |
| **Cosmos DB** | Inside Python agents | Same — count reads/writes/queries |
| **Deepgram STT** | Browser WebSocket (direct) | After session ends, frontend calls `POST /api/usage/voice-stt { audioSeconds }` — NestJS increments counter |
| **Cartesia TTS** | Browser WebSocket (direct) | After synthesis completes, frontend calls `POST /api/usage/voice-tts { characters }` — NestJS increments counter |
| **Stripe** | NestJS Stripe service | After each successful `payment_intent.succeeded` webhook, NestJS increments revenue counter |

### Cost model — all rates configurable via `.env`

| Provider | Unit | Default rate | Env var |
|---|---|---|---|
| Azure OpenAI GPT-4o (input) | per 1M tokens | $2.50 | `COST_AZURE_GPT4O_INPUT_PER_1M` |
| Azure OpenAI GPT-4o (output) | per 1M tokens | $10.00 | `COST_AZURE_GPT4O_OUTPUT_PER_1M` |
| Azure OpenAI GPT-4o-mini (input) | per 1M tokens | $0.15 | `COST_AZURE_GPT4OMINI_INPUT_PER_1M` |
| Azure OpenAI GPT-4o-mini (output) | per 1M tokens | $0.60 | `COST_AZURE_GPT4OMINI_OUTPUT_PER_1M` |
| Azure OpenAI embeddings (text-embedding-3-small) | per 1M tokens | $0.02 | `COST_AZURE_EMBED_PER_1M` |
| Azure Cognitive Search | per 1K queries | $0.25 | `COST_AZURE_SEARCH_PER_1K` |
| Deepgram nova-3 | per minute | $0.0043 | `COST_DEEPGRAM_PER_MINUTE` |
| Cartesia sonic-3 | per 1K characters | $0.065 | `COST_CARTESIA_PER_1K_CHARS` |

Rates are loaded at Python agent startup and NestJS module init. Changing a rate requires a container restart (no hot reload).

### Security constraints — strictly enforced

- **No API keys** in any Prometheus label, Grafana variable, log line, or dashboard annotation
- **No prompts, completions, or user content** in any metric
- **No user-identifying information** in labels — only `user_tier` (free/standard/premium) derived server-side from JWT
- Labels allowed: `provider`, `agent`, `deployment`, `status`, `error_type`, `user_tier`, `plan`
- `userId` is used only server-side to resolve `user_tier`; it never appears in Prometheus storage

---

## 3. Custom Prometheus Metrics — Full Specification

### Python agent metrics (each agent exposes `GET /metrics`)

```
# Azure OpenAI
azure_openai_requests_total          {agent, deployment, status}          Counter
azure_openai_prompt_tokens_total     {agent, deployment}                  Counter
azure_openai_completion_tokens_total {agent, deployment}                  Counter
azure_openai_total_tokens_total      {agent, deployment}                  Counter
azure_openai_cost_usd_total          {agent, deployment}                  Counter
azure_openai_request_duration_seconds{agent, deployment}                  Histogram (.5,1,2,5,10,30s)

# Azure Cognitive Search
azure_search_requests_total          {agent, status}                      Counter
azure_search_cost_usd_total          {agent}                              Counter

# Cosmos DB
cosmos_db_requests_total             {agent, operation, status}           Counter
# operation: read | write | query | delete
```

### NestJS metrics (appended to `GET /metrics`)

```
# Deepgram STT (client-reported via /api/usage/voice-stt)
deepgram_audio_seconds_total         {user_tier}                          Counter
deepgram_sessions_total              {status}                             Counter
deepgram_cost_usd_total              {user_tier}                          Counter

# Cartesia TTS (client-reported via /api/usage/voice-tts)
cartesia_characters_total            {user_tier}                          Counter
cartesia_requests_total              {status}                             Counter
cartesia_cost_usd_total              {user_tier}                          Counter

# Stripe (webhook-triggered)
stripe_payment_intents_total         {status, plan}                       Counter
stripe_revenue_usd_total             {plan, currency}                     Counter

# Cross-provider failure tracking
paid_api_failures_total              {provider, agent, error_type}        Counter
# error_type: timeout | rate_limit | auth_error | server_error

# Agent proxy (NestJS proxy layer)
agent_proxy_requests_total           {agent, status}                      Counter
agent_proxy_duration_seconds         {agent}                              Histogram
```

---

## 4. Files to Create / Modify

### 4a. Python agents — add `/health` and `/metrics` (3 files changed)

| File | Change |
|---|---|
| `backend/agents/03_Agents/api_server.py` | Add `GET /health`, `GET /metrics`, metrics instrumentation around OpenAI + Search + Cosmos calls |
| `backend/agents/CV_Booster_Agent/enhance_cv.py` | Add `GET /health`, `GET /metrics`, metrics around OpenAI calls |
| `backend/agents/JobSearch-SUBUL/main.py` | Add `GET /health`, `GET /metrics`, metrics around OpenAI + Search + Redis calls |

Also add `prometheus-client>=0.20.0` to the shared `backend/agents/requirements.txt` (or per-agent requirements).

For the 3 agents that already have health endpoints (quiz, roadmap, coach) — add only `GET /metrics` and metrics instrumentation.

**Total Python files changed: 6 agents**

### 4b. NestJS backend (4 new files, 2 modified)

```
backend/api/src/usage/
  usage.module.ts          ← imports PrometheusModule; declares controller + service
  usage.controller.ts      ← POST /api/usage/voice-stt  POST /api/usage/voice-tts
  usage.service.ts         ← increments Prometheus counters; validates payload; resolves user_tier
  dto/voice-usage.dto.ts   ← VoiceSttUsageDto, VoiceTtsUsageDto
```

Modified:
- `backend/api/src/app.module.ts` — register `PrometheusModule` + `UsageModule`
- `backend/api/src/payments/stripe.service.ts` (or webhook handler) — add revenue counter increments

### 4c. Monitoring config files (all new)

```
monitoring/
  docker-compose.monitoring.yml
  prometheus/
    prometheus.yml
    rules/
      alerts.yml
  blackbox/
    blackbox.yml
  loki/
    loki-config.yml
  promtail/
    promtail-config.yml
  alertmanager/
    alertmanager.yml
  grafana/
    provisioning/
      datasources/datasources.yml
      dashboards/dashboards.yml
    dashboards/
      subul-overview.json       ← uptime + API health summary
      agents-health.json        ← per-agent latency + uptime
      infrastructure.json       ← host + container + DB metrics
      logs.json                 ← Loki log explorer
      ai-cost.json              ← AI consumption + cost per provider/agent
      revenue-vs-cost.json      ← Stripe revenue vs AI spend
```

---

## 5. docker-compose.monitoring.yml — Full Service Spec

```yaml
# Run alongside the main stack:
#   docker compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
#
# Or monitoring stack alone (when main stack already running):
#   cd monitoring && docker compose -f docker-compose.monitoring.yml up -d

networks:
  subul-network:
    external: true

services:

  prometheus:
    image: prom/prometheus:v2.51.0
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - subul-network

  grafana:
    image: grafana/grafana:10.4.2
    restart: unless-stopped
    ports:
      - "3005:3000"       # 3000 already used by Next.js frontend
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER:-admin}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-changeme}
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_SERVER_ROOT_URL: ${GRAFANA_ROOT_URL:-http://localhost:3005}
      GF_SMTP_ENABLED: ${GF_SMTP_ENABLED:-false}
      GF_SMTP_HOST: ${SMTP_HOST:-}
      GF_SMTP_USER: ${SMTP_USER:-}
      GF_SMTP_PASSWORD: ${SMTP_PASS:-}
      GF_SMTP_FROM_ADDRESS: ${MAIL_FROM:-}
    networks:
      - subul-network

  blackbox-exporter:
    image: prom/blackbox-exporter:v0.25.0
    restart: unless-stopped
    ports:
      - "9115:9115"
    volumes:
      - ./blackbox/blackbox.yml:/etc/blackbox_exporter/config.yml:ro
    networks:
      - subul-network
    dns:
      - 8.8.8.8
      - 8.8.4.4

  loki:
    image: grafana/loki:3.0.0
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - subul-network

  promtail:
    image: grafana/promtail:3.0.0
    restart: unless-stopped
    volumes:
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - subul-network

  node-exporter:
    image: prom/node-exporter:v1.8.0
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - subul-network

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:v0.49.1
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
      - /dev/disk:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg
    networks:
      - subul-network

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:v0.15.0
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: postgresql://${DB_USERNAME:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-shared_db}?sslmode=disable
    networks:
      - subul-network

  redis-exporter:
    image: oliver006/redis_exporter:v1.62.0
    restart: unless-stopped
    ports:
      - "9121:9121"
    environment:
      REDIS_ADDR: redis://redis:6379
    networks:
      - subul-network

  alertmanager:
    image: prom/alertmanager:v0.27.0
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    networks:
      - subul-network

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  alertmanager_data:
```

**Port summary — no conflicts with existing stack:**

| Service | Port |
|---|---|
| Grafana | 3005 |
| Prometheus | 9090 |
| Blackbox Exporter | 9115 |
| Loki | 3100 |
| Node Exporter | 9100 |
| cAdvisor | 8080 |
| postgres-exporter | 9187 |
| redis-exporter | 9121 |
| Alertmanager | 9093 |

---

## 6. Prometheus Scrape Config (`prometheus/prometheus.yml`)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'subul-platform'

rule_files:
  - /etc/prometheus/rules/*.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:

  # ── Infrastructure ──────────────────────────────────────────────

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  # ── NestJS API (default Node.js metrics + custom usage/revenue counters) ─

  - job_name: 'nestjs-api'
    static_configs:
      - targets: ['api:3001']
    metrics_path: /metrics
    scrape_interval: 15s

  # ── Python agents Prometheus metrics (AI cost counters) ─────────
  # Each agent exposes GET /metrics via prometheus_client

  - job_name: 'python-agents-metrics'
    scrape_interval: 30s
    static_configs:
      - targets:
          - 'agent-cloud-tutor:8000'
          - 'agent-quiz:8001'
          - 'agent-roadmap:8002'
          - 'agent-coach:8004'
          - 'agent-cv-booster:8005'
          - 'agent-job-search:8006'
    metrics_path: /metrics

  # ── HTTP health probes via Blackbox Exporter ────────────────────

  - job_name: 'blackbox-agents'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - http://agent-cloud-tutor:8000/health
          - http://agent-quiz:8001/api/quiz/health
          - http://agent-roadmap:8002/api/roadmap/health
          - http://agent-coach:8004/api/coach/health
          - http://agent-cv-booster:8005/health
          - http://agent-job-search:8006/health
          - http://api:3001/api/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: 'blackbox-external'
    metrics_path: /probe
    params:
      module: [http_2xx_insecure]
    static_configs:
      - targets:
          - https://api.stripe.com/v1/account
          - https://api.cartesia.ai/voices
          - https://api.deepgram.com/v1/listen
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115

  - job_name: 'blackbox-smtp'
    metrics_path: /probe
    params:
      module: [tcp_connect]
    static_configs:
      - targets:
          - 'email-smtp.eu-central-1.amazonaws.com:587'
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

---

## 7. Blackbox Exporter Config (`blackbox/blackbox.yml`)

```yaml
modules:

  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_status_codes: [200, 201]
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"

  http_2xx_insecure:
    prober: http
    timeout: 10s
    http:
      valid_status_codes: [200, 401, 403]   # 401/403 = reachable but needs auth = UP
      method: GET
      preferred_ip_protocol: "ip4"

  tcp_connect:
    prober: tcp
    timeout: 5s
```

---

## 8. Loki Config (`loki/loki-config.yml`)

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  retention_period: 30d
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
```

---

## 9. Promtail Config (`promtail/promtail-config.yml`)

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:

  - job_name: docker-containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: status
            values: ['running']
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container_name
      - source_labels: ['__meta_docker_compose_service']
        target_label: service
      - source_labels: ['__meta_docker_container_label_com_docker_compose_project']
        target_label: project
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: stream
    pipeline_stages:
      - multiline:
          firstline: '^\d{4}-\d{2}-\d{2}'
          max_wait_time: 3s
      - json:
          expressions:
            level: level
            message: message
            context: context
      - labels:
          level:
```

---

## 10. Alertmanager Config (`alertmanager/alertmanager.yml`)

```yaml
global:
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_from: '${MAIL_FROM}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASS}'
  smtp_require_tls: false

route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'email-admin'
  routes:
    - match:
        severity: critical
      receiver: 'email-admin'
      repeat_interval: 15m

receivers:
  - name: 'email-admin'
    email_configs:
      - to: '${ADMIN_ALERT_EMAIL:-admin@subul.io}'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
```

---

## 11. Alert Rules (`prometheus/rules/alerts.yml`)

```yaml
groups:

  - name: service_health
    interval: 30s
    rules:

      - alert: ServiceDown
        expr: probe_success == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is DOWN"
          description: "Blackbox probe has failed for 2+ minutes."

      - alert: HighProbeLatency
        expr: probe_duration_seconds > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response on {{ $labels.instance }}"
          description: "HTTP probe latency > 3s for 5 minutes."

  - name: infrastructure
    rules:

      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }}"

      - alert: HighMemory
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Memory > 90% on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: (1 - (node_filesystem_avail_bytes{fstype!="tmpfs"} / node_filesystem_size_bytes{fstype!="tmpfs"})) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Disk > 85% on {{ $labels.instance }}"

  - name: database
    rules:

      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL is down"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"

      - alert: PostgreSQLTooManyConnections
        expr: pg_stat_activity_count > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL: {{ $value }} open connections"

  - name: nestjs_api
    rules:

      - alert: HighEventLoopLag
        expr: nodejs_eventloop_lag_seconds > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NestJS event loop lag > 500ms"

      - alert: HighHeapUsage
        expr: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NestJS heap usage > 90%"

  - name: ai_cost
    rules:

      - alert: DailyAICostExceeded
        expr: |
          (
            increase(azure_openai_cost_usd_total[24h])
            + increase(deepgram_cost_usd_total[24h])
            + increase(cartesia_cost_usd_total[24h])
            + increase(azure_search_cost_usd_total[24h])
          ) > ${AI_DAILY_COST_ALERT_THRESHOLD_USD:-50}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Daily AI cost has exceeded ${{ $value | printf \"%.2f\" }}"
          description: "Threshold: $${AI_DAILY_COST_ALERT_THRESHOLD_USD:-50}. Check ai-cost dashboard."

      - alert: MonthlyAICostExceeded
        expr: |
          (
            increase(azure_openai_cost_usd_total[30d])
            + increase(deepgram_cost_usd_total[30d])
            + increase(cartesia_cost_usd_total[30d])
            + increase(azure_search_cost_usd_total[30d])
          ) > ${AI_MONTHLY_COST_ALERT_THRESHOLD_USD:-1000}
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Monthly AI cost exceeded ${{ $value | printf \"%.2f\" }}"

      - alert: AzureOpenAIHighFailureRate
        expr: |
          rate(azure_openai_requests_total{status="error"}[5m])
          / rate(azure_openai_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Azure OpenAI failure rate > 10% — agent: {{ $labels.agent }}"

      - alert: PaidAPIFailureSpike
        expr: increase(paid_api_failures_total[5m]) > 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.provider }} — {{ $value }} failures in 5 min (agent: {{ $labels.agent }})"
```

---

## 12. Grafana Provisioning

### `grafana/provisioning/datasources/datasources.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
    jsonData:
      maxLines: 1000
```

### `grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: 'Subul Platform'
    orgId: 1
    folder: 'Subul Platform'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

### Dashboard Files — 6 JSON files in `grafana/dashboards/`

| File | Panels |
|---|---|
| `subul-overview.json` | Service health table (all probes), agent up/down status, API request rate, error rate, active DB connections |
| `agents-health.json` | Per-agent probe success %, latency P50/P95/P99, response time heatmap, uptime timeline |
| `infrastructure.json` | CPU/memory/disk per host, container CPU/memory (cAdvisor), PostgreSQL connections + query time, Redis ops/sec + memory, NestJS event loop lag |
| `logs.json` | Loki log explorer filtered by `service` label, log rate histogram, error log stream, last 500 lines |
| `ai-cost.json` | *(new)* Full AI cost and consumption dashboard — see section 13 |
| `revenue-vs-cost.json` | *(new)* Stripe revenue vs AI spend — see section 13 |

---

## 13. AI Cost & Revenue Dashboards — Panel Spec

### `ai-cost.json` — AI Consumption & Cost

| Panel | Type | PromQL (example) |
|---|---|---|
| AI Cost Today | Stat | `sum(increase(azure_openai_cost_usd_total[24h])) + sum(increase(deepgram_cost_usd_total[24h])) + sum(increase(cartesia_cost_usd_total[24h]))` |
| AI Cost This Month | Stat | Same with `[30d]` |
| Cost by Agent (30d) | Bar chart | `sum by(agent) (increase(azure_openai_cost_usd_total[30d]))` |
| Cost by Provider (30d) | Pie chart | Azure OpenAI / Deepgram / Cartesia / Azure Search, each `sum(increase(...[30d]))` |
| Azure OpenAI Tokens (time series) | Time series | `sum by(deployment) (rate(azure_openai_prompt_tokens_total[1h]))` and `..completion_tokens..` |
| Azure OpenAI Cost Trend | Time series | `sum by(agent) (rate(azure_openai_cost_usd_total[1h]) * 3600)` |
| Deepgram Minutes Used (24h) | Stat + time series | `sum(increase(deepgram_audio_seconds_total[24h])) / 60` |
| Cartesia Characters (24h) | Stat + time series | `sum(increase(cartesia_characters_total[24h]))` |
| Azure Search Queries (24h) | Stat | `sum(increase(azure_search_requests_total[24h]))` |
| Top Expensive Agents (30d) | Table | `sum by(agent) (increase(azure_openai_cost_usd_total[30d]))` sorted desc |
| Token Usage by Deployment | Table | `sum by(deployment) (increase(azure_openai_prompt_tokens_total[30d]))` + completion |
| Paid API Failures (24h) | Table | `sum by(provider, agent, error_type) (increase(paid_api_failures_total[24h]))` |
| OpenAI Request Success Rate | Gauge | `rate(azure_openai_requests_total{status="success"}[5m]) / rate(azure_openai_requests_total[5m]) * 100` |

### `revenue-vs-cost.json` — Revenue vs AI Spend

| Panel | Type | PromQL / Notes |
|---|---|---|
| Stripe Revenue Today | Stat | `sum(increase(stripe_revenue_usd_total[24h]))` |
| Stripe Revenue This Month | Stat | `sum(increase(stripe_revenue_usd_total[30d]))` |
| Total AI Cost This Month | Stat | Sum of all cost counters `[30d]` |
| Gross Margin % (Month) | Stat | `(revenue - ai_cost) / revenue * 100` |
| Revenue vs AI Cost Trend | Time series | Dual series, daily rate |
| Revenue by Plan | Bar chart | `sum by(plan) (increase(stripe_revenue_usd_total[30d]))` |
| Successful Payments (30d) | Stat | `sum(increase(stripe_payment_intents_total{status="succeeded"}[30d]))` |

---

## 14. Python Agent Instrumentation — Implementation Detail

### `prometheus-client` integration pattern (all 6 agents)

```python
# Add to requirements.txt: prometheus-client>=0.20.0
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import time, os

AGENT_NAME = "cloud-tutor"   # set per agent: quiz | roadmap | coach | cv-booster | job-search

_oai_requests       = Counter('azure_openai_requests_total', '', ['agent', 'deployment', 'status'])
_oai_prompt_tokens  = Counter('azure_openai_prompt_tokens_total', '', ['agent', 'deployment'])
_oai_comp_tokens    = Counter('azure_openai_completion_tokens_total', '', ['agent', 'deployment'])
_oai_total_tokens   = Counter('azure_openai_total_tokens_total', '', ['agent', 'deployment'])
_oai_cost           = Counter('azure_openai_cost_usd_total', '', ['agent', 'deployment'])
_oai_duration       = Histogram('azure_openai_request_duration_seconds', '', ['agent', 'deployment'],
                                 buckets=[.5, 1, 2, 5, 10, 30])
_search_requests    = Counter('azure_search_requests_total', '', ['agent', 'status'])
_search_cost        = Counter('azure_search_cost_usd_total', '', ['agent'])
_cosmos_requests    = Counter('cosmos_db_requests_total', '', ['agent', 'operation', 'status'])
_paid_failures      = Counter('paid_api_failures_total', '', ['provider', 'agent', 'error_type'])

# Pricing loaded from env (falls back to defaults)
_GPT4O_IN   = float(os.getenv('COST_AZURE_GPT4O_INPUT_PER_1M', '2.50'))
_GPT4O_OUT  = float(os.getenv('COST_AZURE_GPT4O_OUTPUT_PER_1M', '10.00'))
_MINI_IN    = float(os.getenv('COST_AZURE_GPT4OMINI_INPUT_PER_1M', '0.15'))
_MINI_OUT   = float(os.getenv('COST_AZURE_GPT4OMINI_OUTPUT_PER_1M', '0.60'))
_EMBED      = float(os.getenv('COST_AZURE_EMBED_PER_1M', '0.02'))
_SEARCH_1K  = float(os.getenv('COST_AZURE_SEARCH_PER_1K', '0.25'))

def _cost_for_deployment(deployment: str, prompt: int, completion: int) -> float:
    d = deployment.lower()
    if 'mini' in d:
        return (prompt * _MINI_IN + completion * _MINI_OUT) / 1_000_000
    if 'embed' in d or 'embedding' in d:
        return (prompt * _EMBED) / 1_000_000
    return (prompt * _GPT4O_IN + completion * _GPT4O_OUT) / 1_000_000

def record_openai_usage(usage, deployment: str, duration_s: float):
    if not usage:
        return
    prompt     = getattr(usage, 'prompt_tokens', 0) or 0
    completion = getattr(usage, 'completion_tokens', 0) or 0
    total      = getattr(usage, 'total_tokens', prompt + completion)
    cost       = _cost_for_deployment(deployment, prompt, completion)
    _oai_prompt_tokens.labels(agent=AGENT_NAME, deployment=deployment).inc(prompt)
    _oai_comp_tokens.labels(agent=AGENT_NAME, deployment=deployment).inc(completion)
    _oai_total_tokens.labels(agent=AGENT_NAME, deployment=deployment).inc(total)
    _oai_cost.labels(agent=AGENT_NAME, deployment=deployment).inc(cost)
    _oai_duration.labels(agent=AGENT_NAME, deployment=deployment).observe(duration_s)
    _oai_requests.labels(agent=AGENT_NAME, deployment=deployment, status='success').inc()

def record_openai_error(deployment: str, error_type: str):
    _oai_requests.labels(agent=AGENT_NAME, deployment=deployment, status='error').inc()
    _paid_failures.labels(provider='azure_openai', agent=AGENT_NAME, error_type=error_type).inc()

def record_search_query(success: bool):
    status = 'success' if success else 'error'
    _search_requests.labels(agent=AGENT_NAME, status=status).inc()
    if success:
        _search_cost.labels(agent=AGENT_NAME).inc(_SEARCH_1K / 1000)

def record_cosmos_request(operation: str, success: bool):
    _cosmos_requests.labels(agent=AGENT_NAME, operation=operation, status='success' if success else 'error').inc()

@app.get("/metrics")
async def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

**Streaming responses (cloud-tutor NDJSON)**: Azure OpenAI streaming returns `usage` only when `stream_options={"include_usage": True}` is set. Add this parameter when creating streaming completions; read usage from the final chunk (`chunk.usage`). If usage is None (model doesn't support it), fall back to `tiktoken` estimation.

---

## 15. NestJS — Voice Usage Reporting Endpoint

### New module: `backend/api/src/usage/`

```typescript
// usage.controller.ts
// POST /api/usage/voice-stt  — called by browser after each Deepgram session
// POST /api/usage/voice-tts  — called by browser after each Cartesia synthesis
// Both require JwtAuthGuard; userId comes from JWT, never from body

// dto/voice-usage.dto.ts
class VoiceSttUsageDto {
  @IsNumber() @Min(0) @Max(3600)
  audioSeconds: number;          // max 1 hour per session
}

class VoiceTtsUsageDto {
  @IsNumber() @Min(0) @Max(100_000)
  characters: number;            // max 100k chars per call
}
```

```typescript
// usage.service.ts  (pseudocode, actual implementation follows this spec)
async recordSttUsage(userId: number, dto: VoiceSttUsageDto) {
  const tier = await this.subscriptionsService.getUserTier(userId);   // 'free'|'standard'|'premium'
  const minutes = dto.audioSeconds / 60;
  const cost = minutes * this.costConfig.deepgramPerMinute;

  this.deepgramSecondsCounter.labels({ user_tier: tier }).inc(dto.audioSeconds);
  this.deepgramCostCounter.labels({ user_tier: tier }).inc(cost);
  this.deepgramSessionsCounter.labels({ status: 'completed' }).inc();
}

async recordTtsUsage(userId: number, dto: VoiceTtsUsageDto) {
  const tier = await this.subscriptionsService.getUserTier(userId);
  const cost = (dto.characters / 1000) * this.costConfig.cartesiaPer1kChars;

  this.cartesiaCharsCounter.labels({ user_tier: tier }).inc(dto.characters);
  this.cartesiaCostCounter.labels({ user_tier: tier }).inc(cost);
  this.cartesiaRequestsCounter.labels({ status: 'completed' }).inc();
}
```

**Frontend calls** (add to `LabAssistant.tsx` and course page after session/TTS events):
```typescript
// After Deepgram session ends:
await api.post('/api/usage/voice-stt', { audioSeconds });

// After Cartesia TTS completes a chunk batch:
await api.post('/api/usage/voice-tts', { characters: text.length });
```

---

## 16. NestJS — Stripe Revenue Metrics

Add to existing Stripe webhook handler (or `stripe.service.ts`):

```typescript
// Inject counters via @InjectMetric()
// After payment_intent.succeeded:
this.stripeRevenueCounter
  .labels({ plan: planSlug, currency: paymentIntent.currency })
  .inc(paymentIntent.amount / 100);   // convert cents to dollars

this.stripePaymentsCounter
  .labels({ status: 'succeeded', plan: planSlug })
  .inc();

// After payment_intent.payment_failed:
this.stripePaymentsCounter
  .labels({ status: 'failed', plan: planSlug ?? 'unknown' })
  .inc();
this.paidApiFailuresCounter
  .labels({ provider: 'stripe', agent: 'api', error_type: 'payment_failed' })
  .inc();
```

No card numbers, emails, Stripe customer IDs, or secret keys enter any label.

---

## 17. NestJS Prometheus Integration

### Install

```bash
cd backend/api
npm install @willsoto/nestjs-prometheus prom-client
```

### `app.module.ts` additions

```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: '/metrics',
    }),
    UsageModule,
    // ... existing modules
  ],
  providers: [
    // Deepgram counters
    makeCounterProvider({ name: 'deepgram_audio_seconds_total', help: 'Deepgram audio seconds', labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'deepgram_cost_usd_total', help: 'Deepgram estimated cost', labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'deepgram_sessions_total', help: 'Deepgram sessions', labelNames: ['status'] }),
    // Cartesia counters
    makeCounterProvider({ name: 'cartesia_characters_total', help: 'Cartesia TTS characters', labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'cartesia_cost_usd_total', help: 'Cartesia estimated cost', labelNames: ['user_tier'] }),
    makeCounterProvider({ name: 'cartesia_requests_total', help: 'Cartesia TTS requests', labelNames: ['status'] }),
    // Stripe counters
    makeCounterProvider({ name: 'stripe_revenue_usd_total', help: 'Stripe revenue in USD', labelNames: ['plan', 'currency'] }),
    makeCounterProvider({ name: 'stripe_payment_intents_total', help: 'Stripe payment intents', labelNames: ['status', 'plan'] }),
    // Shared failure counter
    makeCounterProvider({ name: 'paid_api_failures_total', help: 'Paid API failures', labelNames: ['provider', 'agent', 'error_type'] }),
    // Agent proxy metrics
    makeCounterProvider({ name: 'agent_proxy_requests_total', help: 'Agent proxy requests', labelNames: ['agent', 'status'] }),
    makeHistogramProvider({ name: 'agent_proxy_duration_seconds', help: 'Agent proxy latency', labelNames: ['agent'], buckets: [.1, .5, 1, 2, 5, 10, 30] }),
  ],
})
export class AppModule {}
```

---

## 18. `.env.example` Additions

```bash
# ── Grafana Monitoring Stack ──────────────────────────────────────────────
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=changeme_in_production
GRAFANA_ROOT_URL=http://localhost:3005
ADMIN_ALERT_EMAIL=admin@subul.io

# ── AI Cost Alert Thresholds ─────────────────────────────────────────────
AI_DAILY_COST_ALERT_THRESHOLD_USD=50
AI_MONTHLY_COST_ALERT_THRESHOLD_USD=1000

# ── AI Provider Pricing (USD) — update when rates change ─────────────────
COST_AZURE_GPT4O_INPUT_PER_1M=2.50
COST_AZURE_GPT4O_OUTPUT_PER_1M=10.00
COST_AZURE_GPT4OMINI_INPUT_PER_1M=0.15
COST_AZURE_GPT4OMINI_OUTPUT_PER_1M=0.60
COST_AZURE_EMBED_PER_1M=0.02
COST_AZURE_SEARCH_PER_1K=0.25
COST_DEEPGRAM_PER_MINUTE=0.0043
COST_CARTESIA_PER_1K_CHARS=0.065
```

---

## 19. Execution Order

1. **Add `GET /health` + `GET /metrics` to 6 Python agents** (all 6 agent files; metrics instrumentation around OpenAI/Search/Cosmos calls)
2. **Add `prometheus-client` to Python requirements**
3. **Install `@willsoto/nestjs-prometheus prom-client`** in `backend/api`
4. **Create `UsageModule`** (usage.module.ts, controller, service, dto)
5. **Update `app.module.ts`** — register PrometheusModule + counter/histogram providers + UsageModule
6. **Wire Stripe revenue counters** in Stripe service/webhook handler
7. **Wire frontend** — add `POST /api/usage/voice-stt` and `voice-tts` calls after session events
8. **Create `monitoring/` directory** with all config files
9. **Write Prometheus config** (`prometheus.yml` + `rules/alerts.yml`)
10. **Write Blackbox, Loki, Promtail, Alertmanager configs**
11. **Write Grafana provisioning** (datasources + dashboard provider YAMLs)
12. **Generate 6 Grafana dashboard JSON files** (4 infra/health + 2 cost dashboards)
13. **Write `docker-compose.monitoring.yml`**
14. **Update `.env.example`**
15. **Rebuild API + all agent containers; start monitoring stack**
16. **Verify**: all 6 agent `/metrics` endpoints scraped; cost counters visible in Prometheus; dashboards load in Grafana

---

## 20. How to Run

```bash
# Start everything together (first time):
docker compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d --build

# Start monitoring stack alone (when main stack already running):
cd monitoring && docker compose -f docker-compose.monitoring.yml up -d

# View Grafana:      http://localhost:3005  →  admin / changeme
# View Prometheus:   http://localhost:9090
# Test agent metrics:
curl http://localhost:8000/metrics   # cloud-tutor
curl http://localhost:3001/metrics   # NestJS

# Reload Prometheus config without restart:
curl -X POST http://localhost:9090/-/reload
```

---

## 21. What Will NOT Be Implemented (Scope Control)

- Kubernetes/Helm deployment — Docker Compose only
- Multi-tenant Grafana organizations
- Grafana OnCall or PagerDuty integration (Alertmanager email only)
- Long-term metric storage (Thanos / Cortex) — 30-day local TSDB sufficient
- Tracing (Jaeger / Tempo)
- Per-user cost breakdown in Prometheus (only `user_tier` aggregate — individual userId tracking requires a separate DB table, not Prometheus)
- Real-time Azure billing API sync (costs are estimated from token counts and configurable rates)

---

## 22. Files Summary

| # | File | Action |
|---|---|---|
| 1 | `backend/agents/03_Agents/api_server.py` | Add `GET /health`, `GET /metrics`, OpenAI/Search/Cosmos instrumentation |
| 2 | `backend/agents/CV_Booster_Agent/enhance_cv.py` | Add `GET /health`, `GET /metrics`, OpenAI instrumentation |
| 3 | `backend/agents/JobSearch-SUBUL/main.py` | Add `GET /health`, `GET /metrics`, OpenAI/Search instrumentation |
| 4 | `backend/agents/quiz_agent/*.py` | Add `GET /metrics`, OpenAI instrumentation |
| 5 | `backend/agents/roadmap_agent/*.py` | Add `GET /metrics`, OpenAI instrumentation |
| 6 | `backend/agents/coach_Agent/*.py` | Add `GET /metrics`, OpenAI/Search/Cosmos instrumentation |
| 7 | `backend/agents/requirements.txt` | Add `prometheus-client>=0.20.0` |
| 8 | `backend/api/src/usage/usage.module.ts` | **NEW** |
| 9 | `backend/api/src/usage/usage.controller.ts` | **NEW** — POST /api/usage/voice-stt + voice-tts |
| 10 | `backend/api/src/usage/usage.service.ts` | **NEW** — counter increments + tier lookup |
| 11 | `backend/api/src/usage/dto/voice-usage.dto.ts` | **NEW** |
| 12 | `backend/api/src/app.module.ts` | Register PrometheusModule + UsageModule + metric providers |
| 13 | `backend/api/src/payments/stripe.service.ts` | Add revenue counter increments in webhook handler |
| 14 | `frontend/components/learner/LabAssistant.tsx` | Call POST /api/usage/voice-stt after STT session; voice-tts after TTS batch |
| 15 | `monitoring/docker-compose.monitoring.yml` | **NEW** — 11-service monitoring stack |
| 16 | `monitoring/prometheus/prometheus.yml` | **NEW** — scrape configs (infra + agents + blackbox + nestjs) |
| 17 | `monitoring/prometheus/rules/alerts.yml` | **NEW** — health + infra + DB + NestJS + AI cost alert rules |
| 18 | `monitoring/blackbox/blackbox.yml` | **NEW** |
| 19 | `monitoring/loki/loki-config.yml` | **NEW** |
| 20 | `monitoring/promtail/promtail-config.yml` | **NEW** |
| 21 | `monitoring/alertmanager/alertmanager.yml` | **NEW** |
| 22 | `monitoring/grafana/provisioning/datasources/datasources.yml` | **NEW** |
| 23 | `monitoring/grafana/provisioning/dashboards/dashboards.yml` | **NEW** |
| 24 | `monitoring/grafana/dashboards/subul-overview.json` | **NEW** |
| 25 | `monitoring/grafana/dashboards/agents-health.json` | **NEW** |
| 26 | `monitoring/grafana/dashboards/infrastructure.json` | **NEW** |
| 27 | `monitoring/grafana/dashboards/logs.json` | **NEW** |
| 28 | `monitoring/grafana/dashboards/ai-cost.json` | **NEW** — AI consumption + cost by agent/provider/deployment |
| 29 | `monitoring/grafana/dashboards/revenue-vs-cost.json` | **NEW** — Stripe revenue vs AI spend, margin |
| 30 | `.env.example` | Add Grafana, cost thresholds, and provider pricing vars |

**Total: 30 files (23 new, 7 modified)**

---

Ready to implement. Confirm to proceed.
