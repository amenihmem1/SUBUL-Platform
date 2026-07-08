#!/bin/bash

set -e

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


echo "Starting application..."

export DATABASE_URL="$APP_DATABASE_URL"
exec gunicorn --bind 0.0.0.0:5000 "app:create_app()" --timeout 120