# SUBUL RH Interview Agent

SUBUL RH is now structured as a deployable microservices application with a
Next.js frontend, an API Gateway, and specialized backend services.

## Structure

- `backend/` for the shared FastAPI codebase and domain modules
- `frontend/` for the Next.js interview UI
- `infra/nginx/` for the API Gateway routing configuration
- `docs/architecture.md` for the target microservices architecture
- `.env` for the main runtime configuration

## Run

### Microservices stack

```powershell
docker compose up --build
```

Frontend URL:

`http://localhost:8080`

Gateway URL:

`http://localhost:8000`

### Frontend

```powershell
cd c:\Users\ameni\Desktop\Stage\ai-agent\frontend
npm run dev
```

Frontend URL:

`http://localhost:3000`

## Main Notes

- The default Docker stack starts `api-gateway`, `interview-service`, `calendar-service`, `analytics-service`, `media-service`, `reporting-service`, and `frontend`.
- Each backend service has its own code entrypoint under `backend/services/*/main.py`.
- Each backend service has its own Dockerfile under `backend/services/*/Dockerfile`.
- Lightweight services have their own dependency files under `backend/services/*/requirements.txt`.
- The backend domain modules are shared, while each production service owns its own FastAPI app and route set.
- All backend services are standalone FastAPI implementations. The Azure
  deployment uses separate service containers only.
- Environment variables are read from the root `.env`.
- Session files and reports are stored under `backend/data/`.

## Deploy

### Backend: Azure Web Apps for Containers

Build and deploy the backend services independently from their service
Dockerfiles:

- `backend/services/interview/Dockerfile`
- `backend/services/calendar/Dockerfile`
- `backend/services/analytics/Dockerfile`
- `backend/services/media/Dockerfile`
- `backend/services/reporting/Dockerfile`

Expose only the API Gateway publicly. See `docs/azure-microservices.md` for the
100% microservices Azure workflow, required Web Apps, and GitHub secrets.

### Frontend: Azure Web App

Deploy the `frontend/` package to the `rh-frontend` Azure Web App. The
`.github/workflows/main_rh-frontend.yml` workflow builds the Next.js standalone
bundle and deploys it with `AZURE_WEBAPP_PUBLISH_PROFILE_FRONTEND`.

Required frontend variables:

- `RH_API_BASE_URL=https://your-api-gateway.example.com`
- `NEXT_PUBLIC_APP_URL=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net`
- `NEXT_PUBLIC_REPORT_SHARE_BASE_URL=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net`

Required calendar email variables on `rh-calendar-service`:

- `SMTP_HOST`, `SMTP_PORT`
- `SMTP_USERNAME`, `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`
- `SMTP_USE_TLS`, `SMTP_USE_SSL`
- `INTERVIEW_REMINDER_MINUTES_BEFORE`

Keep `.env` and `frontend/.env.local` out of GitHub; configure secrets in Azure
App Service and GitHub repository secrets.
