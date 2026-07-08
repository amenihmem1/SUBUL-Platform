# Building Agent Images

## If you see "failed to fetch anonymous token" or EOF when pulling `python:3.11-slim`

This usually means Docker cannot reach Docker Hub (network, firewall, or VPN).

**Options:**

1. **Check network**  
   Try: `docker pull python:3.11-slim` in a terminal. If it fails, fix network/VPN/firewall or use a different connection.

2. **Use a registry mirror**  
   Configure a mirror in Docker Desktop (Settings → Docker Engine) or in `/etc/docker/daemon.json`:
   ```json
   { "registry-mirrors": ["https://your-mirror.example.com"] }
   ```
   Then restart Docker.

3. **Override the base image**  
   If you have the image from another source (e.g. mirror or private registry), pass it at build time:
   ```bash
   docker compose build agent-job-search --build-arg BASE_IMAGE=your-registry/python:3.11-slim
   ```

## Image size

- **Job Search agent** (JobSearch-SUBUL) uses a dedicated stage with only its dependencies and **CPU-only PyTorch**, so it is much smaller than a single image that merged all agents’ requirements.
- Other agents use a shared base without Job Search (no sentence-transformers/torch there).
- Build from the repo root: `docker compose build agent-job-search` (or `docker compose up -d agent-job-search`). JobSearch-SUBUL keeps its env via `backend/agents/JobSearch-SUBUL/.env.txt` and root `.env` in docker-compose.
