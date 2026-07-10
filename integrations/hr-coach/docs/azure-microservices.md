# Azure 100% Microservices Deployment

This deployment keeps the same runtime split as Docker Compose:

| Azure Web App | Container image | Service |
| --- | --- | --- |
| `rh-api-gateway` | `rh-api-gateway` | Public Nginx gateway |
| `rh-interview-service` | `rh-interview-service` | Interview lifecycle, CV upload, session messages |
| `rh-media-service` | `rh-media-service` | STT, TTS, vision, audio, proctoring |
| `rh-analytics-service` | `rh-analytics-service` | HR dashboard aggregation |
| `rh-reporting-service` | `rh-reporting-service` | HR and Insights PDFs |
| `rh-calendar-service` | `rh-calendar-service` | Interview planning and cancellation |
| `rh-frontend` | Node.js standalone package | Next.js frontend |

The old single-process backend entrypoint has been removed from the production
deployment. Azure runs only the API Gateway, the five backend service
containers, and the frontend Web App.

## Required Azure resources

Create one Azure Container Registry, six Linux Web Apps for backend containers,
and one Linux Node.js Web App for the frontend:

- `rh-api-gateway`
- `rh-interview-service`
- `rh-media-service`
- `rh-analytics-service`
- `rh-reporting-service`
- `rh-calendar-service`
- `rh-frontend`

If `rh-frontend` already exists, pass `-SkipFrontend` to the script and only
copy the frontend app settings from this document.

You can create the resources from Azure Cloud Shell with:

```powershell
./scripts/azure/create-microservices.ps1 `
  -ResourceGroup "rh-agent-rg" `
  -Location "francecentral" `
  -PlanName "rh-agent-linux-plan" `
  -AcrName "rhagentacr"
```

Use a globally unique ACR name if `rhagentacr` is already taken.

Each container app must expose port `8000`:

```text
WEBSITES_PORT=8000
WEBSITE_WEBDEPLOY_USE_SCM=true
```

For Linux Web Apps, set `WEBSITE_WEBDEPLOY_USE_SCM=true` before downloading
publish profiles. Otherwise GitHub Actions can fail during container deploy
with `Failed to get app runtime OS`.

If the Web Apps do not use managed identity to pull from ACR, configure the
container registry settings on each service:

```text
DOCKER_REGISTRY_SERVER_URL=https://<your-acr-login-server>
DOCKER_REGISTRY_SERVER_USERNAME=<acr username>
DOCKER_REGISTRY_SERVER_PASSWORD=<acr password>
```

## GitHub secrets

Add these repository secrets:

```text
AZURE_CONTAINER_REGISTRY_LOGIN_SERVER
AZURE_CONTAINER_REGISTRY_USERNAME
AZURE_CONTAINER_REGISTRY_PASSWORD

AZURE_WEBAPP_PUBLISH_PROFILE_FRONTEND
```

Backend publish profiles are not used by this deployment. Backend Web Apps are
pinned to the `:latest` container tag and use App Service container continuous
deployment to pull new images from ACR after GitHub pushes them.

## Gateway app settings

Set these app settings on `rh-api-gateway`:

```text
WEBSITES_PORT=8000
INTERVIEW_SERVICE_URL=https://rh-interview-service.azurewebsites.net
MEDIA_SERVICE_URL=https://rh-media-service.azurewebsites.net
ANALYTICS_SERVICE_URL=https://rh-analytics-service.azurewebsites.net
REPORTING_SERVICE_URL=https://rh-reporting-service.azurewebsites.net
CALENDAR_SERVICE_URL=https://rh-calendar-service.azurewebsites.net
```

## Backend service app settings

Set the shared backend runtime settings on every backend service:

```text
WEBSITES_PORT=8000
DATABASE_URL=<postgres connection string>
PUBLIC_APP_URL=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net
CORS_ALLOW_ORIGINS=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net
```

Also copy the API keys needed by the services that use them, for example:

```text
OPENAI_API_KEY
AZURE_OPENAI_API_KEY
AZURE_OPENAI_ENDPOINT
DEEPGRAM_API_KEY
CARTESIA_API_KEY
AZURE_STORAGE_CONNECTION_STRING
```

## Calendar email app settings

Set these additional app settings on `rh-calendar-service` to enable interview
confirmation emails and reminder emails in Azure:

```text
INTERVIEW_CALENDAR_REQUIRE_POSTGRES=true
SMTP_HOST=<smtp host>
SMTP_PORT=587
SMTP_USERNAME=<smtp username>
SMTP_PASSWORD=<smtp password>
SMTP_FROM_EMAIL=<sender email>
SMTP_FROM_NAME=SUBUL RH
SMTP_USE_TLS=true
SMTP_USE_SSL=false
INTERVIEW_REMINDER_MINUTES_BEFORE=60
INTERVIEW_REMINDER_POLL_INTERVAL_S=30
```

The calendar service reports `reminders.enabled=false` until `SMTP_HOST` and
either `SMTP_FROM_EMAIL` or `SMTP_USERNAME` are configured. Confirmation email
delivery is returned by the create interview API as
`emails.confirmation.sent`.

## Frontend app settings

Set the frontend backend base URL to the public gateway:

```text
RH_API_BASE_URL=https://rh-api-gateway.azurewebsites.net
NEXT_PUBLIC_APP_URL=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net
NEXT_PUBLIC_REPORT_SHARE_BASE_URL=https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net
```

## Deployment flow

On every push to `main`, `.github/workflows/azure_microservices.yml` builds and
pushes one Docker image per backend service. App Service container continuous
deployment pulls the updated `:latest` image into each backend Web App.
`.github/workflows/main_rh-frontend.yml` deploys the frontend to `rh-frontend`
with `AZURE_WEBAPP_PUBLISH_PROFILE_FRONTEND`.

There is no single-process backend workflow in the production path, so a normal
production push deploys only the API Gateway, backend microservices, and
frontend service.
