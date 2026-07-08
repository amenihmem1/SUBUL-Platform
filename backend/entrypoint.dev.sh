#!/bin/sh
set -e

export PYTHONPATH="/app/shared-models:$PYTHONPATH"

echo "Waiting for database..."
while ! nc -z postgres 5432; do
  sleep 0.1
done

echo "Database is ready!"

echo "Running migrations"
cd /app
DATABASE_URL="$DATABASE_URL" FLASK_APP=shared_models.cli:app flask db upgrade

echo "Starting application..."
cd /app/backend
exec gunicorn --bind 0.0.0.0:5000 "app:create_app()" --timeout 120 --reload