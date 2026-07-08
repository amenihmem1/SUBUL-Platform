# Pin to node:20-alpine for reproducible builds.
# To update, run: docker pull node:20-alpine && docker inspect --format='{{index .RepoDigests 0}}' node:20-alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Prevent Puppeteer from downloading Chrome during npm install (we use system Chromium in runtime image).
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Build context is backend/ (not backend/api/)
COPY api/package*.json ./

# Install dependencies (reproducible with lockfile); tolerate flaky registry during CI (ECONNRESET).
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 15 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 30000 \
    && npm config set fetch-retry-maxtimeout 180000 \
    && npm config set fetch-timeout 600000 \
    && npm config set maxsockets 5 \
    && sh -c 'for attempt in 1 2 3 4 5; do if npm ci; then exit 0; fi; echo "npm ci failed: attempt $$attempt of 5, sleeping 15s before retry"; [ "$$attempt" -eq 5 ] && exit 1; sleep 15; done'

# Copy API source + root courses seed file + academy certification pack (seed/subul-certification-pack/*.json)
COPY api/. .
COPY courses.json ./courses.json

# Build the application
RUN npm run build

# ── Production stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security baseline: this image is rebuilt from the sanitized `main` after the
# 2026-07-03 supply-chain incident (force-pushed backdoor commits). Bumping this
# label forces a clean backend image build so the `:latest` tag no longer points
# to any image produced during the compromise window (2026-07-02 → 2026-07-03).
LABEL org.subul.security.clean-rebuild="2026-07-03"

# Run as non-root user — least-privilege principle.
# node:alpine ships with a built-in `node` user (uid 1000); we create an
# explicit group so permissions are predictable across image rebuilds.
RUN addgroup --system --gid 1001 appgroup \
 && adduser  --system --uid 1001 --ingroup appgroup --no-create-home appuser

# Install system Chromium for Puppeteer PDF rendering.
RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Default Chromium path inside alpine image.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Auto-seed labs on every container start (idempotent upsert — safe to run always).
# Set to false to disable if needed.
ENV AUTO_SEED_LABS_ON_BOOT=true
# Ensure TypeORM runs in migration mode (not synchronize) in production
ENV NODE_ENV=production

# Copy built assets and runtime dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=builder /app/certif_courses.json ./certif_courses.json
COPY --from=builder /app/courses.json ./courses.json
COPY --from=builder /app/seed/subul-certification-pack ./seed/subul-certification-pack

# Strip devDependencies from the runtime image (halves node_modules size).
RUN npm prune --omit=dev 2>/dev/null || true

RUN chmod +x /app/docker-entrypoint.sh \
 && chown -R appuser:appgroup /app

# Switch to non-root for all subsequent instructions and runtime.
USER appuser

# Expose port
EXPOSE 3001

# Health check — Docker / EKS will restart the container if /api/health
# stops responding. start-period gives migrations/seeds time to finish.
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e \
    "require('http').get('http://localhost:3001/api/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# dumb-init is PID 1 — it forwards SIGTERM to the shell entrypoint so
# Kubernetes / ECS drains connections gracefully instead of SIGKILL after 30s.
STOPSIGNAL SIGTERM
ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/docker-entrypoint.sh"]
