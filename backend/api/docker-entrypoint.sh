#!/bin/sh
set -e

echo "[api-entrypoint] Running database migrations..."
if [ -f "/app/dist/data-source.js" ]; then
  npm run migration:run || echo "[api-entrypoint] Migration failed or nothing to run — continuing..."
else
  echo "[api-entrypoint] dist/data-source.js not found — skipping migrations (synchronize mode will handle schema)"
fi

# Seed is opt-in. Set RUN_SEED_ON_BOOT=true to run seed:run.
# Default profile when enabled: baseline.
if [ "${RUN_SEED_ON_BOOT:-false}" = "true" ]; then
  export SEED_PROFILE="${SEED_PROFILE:-baseline}"
  echo "[api-entrypoint] Seeding database (SEED_PROFILE=${SEED_PROFILE})..."
  npm run seed:run || echo "[api-entrypoint] Seed step failed or skipped — continuing..."
else
  echo "[api-entrypoint] Skipping full seed (RUN_SEED_ON_BOOT is not true)"
fi

# Labs-only upsert: runs on every boot by default so lab content is always
# up-to-date with labs-seed.data.ts without requiring a full seed cycle.
# Set AUTO_SEED_LABS_ON_BOOT=false to disable.
if [ "${AUTO_SEED_LABS_ON_BOOT:-true}" = "true" ]; then
  echo "[api-entrypoint] Auto-seeding labs (AUTO_SEED_LABS_ON_BOOT=true)..."
  node /app/dist/seed/seed-labs-only.js || echo "[api-entrypoint] Labs seed failed — continuing..."
else
  echo "[api-entrypoint] Skipping labs auto-seed (AUTO_SEED_LABS_ON_BOOT=false)"
fi

# Idempotent Subul certification academy pack — enabled by default so certifications
# are always restored after any destructive DB operation. Override with
# AUTO_SEED_CERTIFICATION_PACK=false to disable.
if [ "${AUTO_SEED_CERTIFICATION_PACK:-true}" = "true" ] && [ -f "/app/dist/seed/seed-certification-pack.js" ]; then
  echo "[api-entrypoint] Importing certification academy pack (AUTO_SEED_CERTIFICATION_PACK=true)..."
  node /app/dist/seed/seed-certification-pack.js || echo "[api-entrypoint] Certification pack import failed or skipped — continuing..."
elif [ "${AUTO_SEED_CERTIFICATION_PACK:-true}" = "true" ]; then
  echo "[api-entrypoint] Certification pack script not found at dist/seed/seed-certification-pack.js — skipping"
else
  echo "[api-entrypoint] Skipping certification pack import (AUTO_SEED_CERTIFICATION_PACK is not true)"
fi

if [ "${FORCE_PLAN_SEED:-false}" = "true" ]; then
  echo "[api-entrypoint] FORCE_PLAN_SEED=true — subscription plan prices will be overwritten from code on startup."
else
  echo "[api-entrypoint] FORCE_PLAN_SEED=false — existing plan prices in DB will be preserved."
fi

echo "[api-entrypoint] Starting API..."
exec npm run start:prod
