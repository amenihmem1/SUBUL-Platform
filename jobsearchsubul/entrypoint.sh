#!/bin/bash
set -e

# Optional Postgres bootstrap (legacy). Kafka-only consumer can set SKIP_DB_WAIT=true.
if [ "${SKIP_DB_WAIT:-false}" = "true" ] || [ -z "${POSTGRES_HOST:-}" ]; then
  echo "[entrypoint] SKIP_DB_WAIT or no POSTGRES_HOST — starting consumer without DB wait"
  exec python3 -m jobsearchsubul.tools.consumer
fi

if [ ! -f "/mnt/secrets/db_user_secret" ]; then
  echo "[entrypoint] /mnt/secrets/db_user_secret not found — starting consumer without DB URL"
  exec python3 -m jobsearchsubul.tools.consumer
fi

APP_PASSWORD=$(cat "/mnt/secrets/db_user_secret")
urlencode() {
  python3 -c "import urllib.parse, sys; print(urllib.parse.quote_plus(sys.argv[1]))" "$1"
}
ENC_APP_PASSWORD=$(urlencode "$APP_PASSWORD")
APP_DATABASE_URL="postgresql://${POSTGRES_USER}:${ENC_APP_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "Waiting for PostgreSQL..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 1
done
echo "PostgreSQL is available"

echo "Starting job consumer..."
export DATABASE_URL="$APP_DATABASE_URL"
exec python3 -m jobsearchsubul.tools.consumer
