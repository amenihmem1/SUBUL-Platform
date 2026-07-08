# Dedicated image for job-scraper, job-consumer, prefect-agent (not NestJS API).
# Build from repo root: docker build -f jobsearchsubul/Dockerfile -t <acr>.azurecr.io/subul-job-scraper:latest .
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    netcat-openbsd \
    chromium \
    chromium-driver \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

COPY jobsearchsubul/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY jobsearchsubul /app/jobsearchsubul

RUN chmod +x /app/jobsearchsubul/entrypoint.sh

# Default: run minimal Qureos scraper (override in Kubernetes per deployment)
CMD ["python", "-m", "jobsearchsubul.tools.scrapmain"]
