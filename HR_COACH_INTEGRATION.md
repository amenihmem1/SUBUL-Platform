# HR Coach Integration Guide

## Overview

The HR Coach microservices have been integrated into the Subul Platform. The integration includes:

- **Frontend**: Next.js UI accessible at port 8080
- **Backend Services**: FastAPI microservices for interview, calendar, analytics, media, and reporting
- **API Gateway**: Nginx routing for backend services (port 8099)

## Project Structure

```
subul-platform-main/
├── backend/
│   ├── hr-coach/              # New HR Coach backend microservices
│   │   ├── services/
│   │   │   ├── interview/
│   │   │   ├── calendar/
│   │   │   ├── analytics/
│   │   │   ├── media/
│   │   │   └── reporting/
│   │   ├── core/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── agents/                # Existing agents (coach_Agent, quiz_Agent, etc.)
├── frontend/
│   ├── hr-coach/              # New HR Coach Next.js frontend
│   ├── app/
│   │   └── [locale]/dashboard/learner/hr-coach/  # Integration entry point
│   └── .env.local
├── docker-compose.yml         # Main orchestration
└── docker-compose.hr-coach.yml  # HR Coach extension (NEW)
```

## Running the Complete Stack

### Option 1: With HR Coach Services

```powershell
# Start everything including HR Coach microservices
docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up --build

# Access points:
# - Main Platform: http://localhost:3000
# - HR Coach UI: http://localhost:8080 (embedded in main platform)
# - HR Coach Gateway: http://localhost:8099
# - Individual services: http://localhost:8100-8104
```

### Option 2: Main Platform Only

```powershell
# Start without HR Coach (if services have issues)
docker compose -f docker-compose.yml up --build
```

## Development

### Start Frontend Development Server (HR Coach)

```powershell
cd frontend/hr-coach
npm install
npm run dev          # Starts on http://localhost:3000
# or
npm run start        # Starts on http://localhost:8080 (production mode)
```

### Start Backend Services (HR Coach)

```powershell
cd backend/hr-coach

# Install dependencies
pip install -r requirements.txt

# Create environment
cp .env.example .env  # If available

# Run specific service
cd services/interview
uvicorn main:app --reload --port 8000
```

## Integration Points

### Frontend Entry Point
- File: `frontend/app/[locale]/dashboard/learner/hr-coach/page.tsx`
- This page embeds the HR Coach UI in an iframe
- URL source: `NEXT_PUBLIC_HR_COACH_URL` environment variable
- Default: `http://localhost:8080`

### Backend API Gateway
- Gateway URL: `http://localhost:8099` (internal to docker) or `http://localhost:8099` (host)
- Used by frontend: `RH_API_BASE_URL` environment variable

### Service URLs (Internal to Docker Network)
- Interview Service: `http://hr-coach-interview:8000`
- Calendar Service: `http://hr-coach-calendar:8000`
- Analytics Service: `http://hr-coach-analytics:8000`
- Media Service: `http://hr-coach-media:8000`
- Reporting Service: `http://hr-coach-reporting:8000`

## Environment Configuration

### Required Variables (add to `.env`)

```env
# HR Coach Frontend
NEXT_PUBLIC_HR_COACH_URL=http://localhost:8080
RH_API_BASE_URL=http://localhost:8099

# HR Coach Database (optional, for persistent data)
HR_COACH_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hr_coach_db
```

### Current Frontend Config
Located in: `frontend/.env.local`

```env
NEXT_PUBLIC_HR_COACH_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=https://app.subul.uk
```

## Verification Checklist

- [ ] Docker images build without errors
- [ ] HR Coach frontend loads at http://localhost:8080
- [ ] HR Coach embedded iframe displays in main platform at `/dashboard/learner/hr-coach`
- [ ] Backend services respond to health checks
- [ ] API Gateway routes requests to correct microservices
- [ ] Language parameters sync between main platform and HR Coach

## Troubleshooting

### HR Coach Page Not Loading
1. Check if `hr-coach-frontend` container is running: `docker ps | grep hr-coach-frontend`
2. Check frontend logs: `docker logs hr-coach-frontend`
3. Verify `NEXT_PUBLIC_HR_COACH_URL` in `frontend/.env.local`

### Backend Services Not Responding
1. Verify services are running: `docker ps | grep hr-coach`
2. Check API Gateway logs: `docker logs hr-coach-gateway`
3. Test gateway directly: `curl http://localhost:8099/health`

### Environment Variables Not Applied
1. Restart services: `docker compose restart`
2. Rebuild images: `docker compose build --no-cache`
3. Check .env files are in root directory

## Additional Resources

- HR Coach Source: `backend/hr-coach/`
- Frontend Source: `frontend/hr-coach/`
- Docker Compose Config: `docker-compose.hr-coach.yml`
- Main Integration: `frontend/app/[locale]/dashboard/learner/hr-coach/page.tsx`

## Next Steps

1. Configure database connection in `.env` if using persistent storage
2. Set up API keys for external services (Azure, DeepGram, etc.) in `backend/hr-coach/.env`
3. Deploy to Azure Web Apps following the microservices deployment guide in `docs/`
