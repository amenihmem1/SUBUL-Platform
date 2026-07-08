FROM node:20.9.0-alpine AS base
WORKDIR /app

# Dependency layer (max cache reuse)
COPY package*.json ./
# patches/ must exist before npm ci so the postinstall patch-package step can apply them
COPY patches/ ./patches/
# Flaky registry / CI: fewer parallel sockets + many retries; outer loop when npm's own retries exhaust (ECONNRESET).
RUN npm config set fetch-retries 15 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 30000 \
    && npm config set fetch-retry-maxtimeout 180000 \
    && npm config set fetch-timeout 600000 \
    && npm config set maxsockets 5 \
    && sh -c 'for attempt in 1 2 3 4 5; do if npm ci; then exit 0; fi; echo "npm ci failed: attempt $$attempt of 5, sleeping 15s before retry"; [ "$$attempt" -eq 5 ] && exit 1; sleep 15; done'

FROM base AS dev
ENV NODE_ENV=development
EXPOSE 3000
# Source code is bind-mounted in docker-compose for instant reload.
CMD ["sh", "-c", "[ -d node_modules/next ] || npm ci; npx next dev --hostname 0.0.0.0 --port 3000"]

FROM base AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG BACKEND_URL
ARG BACKEND_INTERNAL_URL
ARG NEXT_PUBLIC_DEEPGRAM_API_KEY
ARG DEEPGRAM_API_KEY
ARG VITE_DEEPGRAM_API_KEY
ARG NEXT_PUBLIC_CARTESIA_API_KEY
ARG CARTESIA_API_KEY
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_AGENT_API_TIMEOUT_MS
ARG NEXT_PUBLIC_QUIZ_AGENT_URL
ARG NEXT_PUBLIC_ROADMAP_AGENT_URL
ARG NEXT_PUBLIC_CV_BOOSTER_AGENT_URL
ARG NEXT_PUBLIC_JOB_SEARCH_AGENT_URL
ARG NEXT_PUBLIC_COACH_AGENT_URL
ARG NEXT_PUBLIC_CLOUD_TUTOR_AGENT_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BACKEND_URL=$BACKEND_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-$BACKEND_URL}
ENV NEXT_PUBLIC_AGENT_API_TIMEOUT_MS=${NEXT_PUBLIC_AGENT_API_TIMEOUT_MS:-300000}
ENV NEXT_PUBLIC_QUIZ_AGENT_URL=$NEXT_PUBLIC_QUIZ_AGENT_URL
ENV NEXT_PUBLIC_ROADMAP_AGENT_URL=$NEXT_PUBLIC_ROADMAP_AGENT_URL
ENV NEXT_PUBLIC_CV_BOOSTER_AGENT_URL=$NEXT_PUBLIC_CV_BOOSTER_AGENT_URL
ENV NEXT_PUBLIC_JOB_SEARCH_AGENT_URL=$NEXT_PUBLIC_JOB_SEARCH_AGENT_URL
ENV NEXT_PUBLIC_COACH_AGENT_URL=$NEXT_PUBLIC_COACH_AGENT_URL
ENV NEXT_PUBLIC_CLOUD_TUTOR_AGENT_URL=$NEXT_PUBLIC_CLOUD_TUTOR_AGENT_URL
# Browser TTS/STT keys are inlined at `next build`. Compose often passes only CARTESIA_API_KEY /
# DEEPGRAM_API_KEY from root `.env`; resolve fallbacks here (nested compose defaults are brittle).
RUN CART="$NEXT_PUBLIC_CARTESIA_API_KEY"; \
    [ -n "$CART" ] || CART="$CARTESIA_API_KEY"; \
    DG="$NEXT_PUBLIC_DEEPGRAM_API_KEY"; \
    [ -n "$DG" ] || DG="$DEEPGRAM_API_KEY"; \
    [ -n "$DG" ] || DG="$VITE_DEEPGRAM_API_KEY"; \
    export NEXT_PUBLIC_CARTESIA_API_KEY="$CART" NEXT_PUBLIC_DEEPGRAM_API_KEY="$DG"; \
    if [ -z "$CART" ]; then echo "WARNING: No Cartesia key at build time — lesson narration will be silent in this image." >&2; fi; \
    if [ -z "$DG" ]; then echo "WARNING: No Deepgram key at build time — voice input may fail in this image." >&2; fi; \
    npm run build

FROM node:20.9.0-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npm", "start"]
