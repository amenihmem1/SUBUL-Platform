# 504 Gateway Timeout Fix

## Problem

When deploying the platform, communication between frontend → API → Python agents sometimes takes too long, causing 504 Gateway Timeout errors. This happens because timeout configurations across the request chain were not properly aligned.

## Root Cause

The request flow is:
```
Browser → AWS ALB (4000s) → Frontend → Backend (NestJS) → Python Agents
```

While the AWS ALB was configured for 4000s timeout, intermediate components had:
1. No explicit HTTP server timeout configuration in NestJS
2. No HTTP keep-alive for backend → agent connections
3. No retry logic for transient network errors in frontend
4. Kubernetes probes that could terminate pods during slow operations

## Changes Made

### 1. Backend HTTP Server Timeouts (`backend/api/src/main.ts`)

Added explicit HTTP server timeout configuration:
- `keepAliveTimeout`: 4,200,000ms (slightly above ALB timeout)
- `headersTimeout`: 4,200,000ms
- `timeout`: 4,100,000ms

This ensures the NestJS server won't drop connections before the ALB timeout.

### 2. Backend Agent HTTP Client (`backend/api/src/agents/agents.service.ts`)

Added HTTP keep-alive agent with connection pooling:
- `keepAlive: true` - Reuse connections
- `maxSockets: 50` - Limit concurrent connections
- `maxFreeSockets: 10` - Keep idle connections for reuse
- `keepAliveMsecs: 30,000` - Send keep-alive packets

This prevents connection drops during long-running agent operations.

### 3. Frontend Retry Logic (`frontend/lib/api/axios.ts`)

Added retry logic with exponential backoff:
- Retries: 2 attempts for transient errors
- Retryable status codes: 504, 503, 502
- Exponential backoff: 1s, 2s, 4s (capped at 5s)
- Jitter to prevent thundering herd

### 4. Kubernetes Deployment Patch (`eks/backend-deployment-patch.yaml`)

Added proper readiness/liveness probes and resource limits:
- Readiness probe: 30s initial delay, 5s timeout
- Liveness probe: 60s initial delay, 10s timeout
- Resource limits: 2 CPU, 2Gi memory

## Deployment Instructions

### Option 1: Full Redeploy (Recommended)

1. Commit and push the changes:
```bash
git add backend/api/src/main.ts
git add backend/api/src/agents/agents.service.ts
git add frontend/lib/api/axios.ts
git add eks/backend-deployment-patch.yaml
git commit -m "fix: add timeout configuration to prevent 504 errors"
git push
```

2. The CI/CD pipeline will rebuild and redeploy with the new timeouts.

### Option 2: Patch Existing Deployment (Immediate Fix)

If you need to fix the running deployment immediately:

```bash
# Navigate to EKS directory
cd eks

# Apply deployment patch
kubectl patch deployment backend -n subul --type=strategic --patch-file backend-deployment-patch.yaml

# Restart backend deployment to pick up new settings
kubectl rollout restart deployment/backend -n subul

# Monitor rollout
kubectl rollout status deployment/backend -n subul
```

## Configuration Reference

| Component | Setting | Value | Notes |
|-----------|---------|-------|-------|
| AWS ALB | `idle_timeout.timeout_seconds` | 4000 | Already configured in `ingresses.yaml` |
| NestJS Server | `keepAliveTimeout` | 4,200,000ms | Must be > ALB timeout |
| NestJS Server | `headersTimeout` | 4,200,000ms | Must be > ALB timeout |
| Backend → Agents | `AGENT_HTTP_TIMEOUT_MS` | 4,000,000ms | Matches ALB timeout |
| Backend → Agents | Keep-alive | Enabled | Connection reuse |
| Frontend | `DEFAULT_AGENT_API_TIMEOUT_MS` | 4,000,000ms | Already configured |
| Frontend | Max retries | 2 | For transient errors |
| Kubernetes | Readiness timeout | 5s | Prevents premature failures |
| Kubernetes | Liveness timeout | 10s | Allows slow operations |

## Monitoring

After deployment, monitor for 504 errors:

```bash
# Check backend logs for timeout messages
kubectl logs deployment/backend -n subul --tail=100 | grep -i timeout

# Check for pod restarts
kubectl get pods -n subul

# View pod events
kubectl describe deployment/backend -n subul
```

## Troubleshooting

If 504 errors persist:

1. **Check ALB access logs** - Verify if the timeout is happening at the ALB level
2. **Check Python agent health** - Slow agent responses may indicate resource constraints
3. **Increase agent replicas** - Add more Python agent pods if they're overloaded
4. **Check network policies** - Ensure no network policies are throttling inter-service traffic

## Related Files

- `eks/ingresses.yaml` - ALB configuration
- `backend/api/src/main.ts` - NestJS server setup
- `backend/api/src/agents/agents.service.ts` - Agent HTTP client
- `frontend/lib/api/axios.ts` - Frontend API client
- `frontend/lib/agent-timeout.ts` - Frontend timeout constants
- `docker-compose.yml` - Local development timeouts
