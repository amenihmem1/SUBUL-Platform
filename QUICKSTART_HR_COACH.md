# HR Coach Integration - Quick Start

## ✅ What Was Done

The **HR Coach** microservices application has been successfully integrated into the **Subul Platform**. All code has been copied and configured to work alongside the existing agents.

### Components Added

| Component | Location | Type | Port |
|-----------|----------|------|------|
| HR Coach Frontend | `frontend/hr-coach/` | Next.js App | 8080 |
| Backend Services | `backend/hr-coach/` | Python FastAPI | 8100-8104 |
| Interview Service | `backend/hr-coach/services/interview/` | FastAPI | 8100 |
| Calendar Service | `backend/hr-coach/services/calendar/` | FastAPI | 8101 |
| Analytics Service | `backend/hr-coach/services/analytics/` | FastAPI | 8102 |
| Media Service | `backend/hr-coach/services/media/` | FastAPI | 8103 |
| Reporting Service | `backend/hr-coach/services/reporting/` | FastAPI | 8104 |
| API Gateway | Nginx Router | Gateway | 8099 |

### Configuration Files Created

- ✅ `docker-compose.hr-coach.yml` - Docker Compose extension
- ✅ `HR_COACH_INTEGRATION.md` - Detailed integration guide
- ✅ `verify-hr-coach-integration.bat` - Verification script
- ✅ `QUICKSTART_HR_COACH.md` - This file

## 🚀 Getting Started

### Step 1: Start the Complete Stack

```powershell
cd c:\Users\ameni\Desktop\subul-platform-main\subul-platform-main

# Start with HR Coach services
docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up --build

# Or just the main platform (without HR Coach)
docker compose -f docker-compose.yml up --build
```

### Step 2: Access the Platform

- **Main Platform**: http://localhost:3000
- **HR Coach UI** (standalone): http://localhost:8080
- **HR Coach API Gateway**: http://localhost:8099

### Step 3: Navigate to HR Coach

1. Log in to http://localhost:3000 as a learner
2. Click on the "CARRIÈRE" section in the sidebar
3. Select "Subul HR Coach"
4. The HR Coach interface will load in an iframe

## 📁 File Structure

```
subul-platform-main/
├── backend/
│   ├── hr-coach/                    ← NEW: HR Coach backend
│   │   ├── services/
│   │   │   ├── interview/
│   │   │   ├── calendar/
│   │   │   ├── analytics/
│   │   │   ├── media/
│   │   │   └── reporting/
│   │   ├── core/
│   │   ├── data/
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   └── agents/                      (existing agents)
│
├── frontend/
│   ├── hr-coach/                    ← NEW: HR Coach frontend
│   │   ├── app/
│   │   ├── lib/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── app/
│   │   └── [locale]/dashboard/learner/hr-coach/page.tsx  ← integration entry
│   └── .env.local
│
├── docker-compose.yml               (existing)
├── docker-compose.hr-coach.yml      ← NEW: HR Coach services config
├── HR_COACH_INTEGRATION.md          ← NEW: detailed guide
├── QUICKSTART_HR_COACH.md           ← NEW: this file
└── verify-hr-coach-integration.bat  ← NEW: verification script
```

## 🔧 Environment Variables

The following variables are already configured in `frontend/.env.local`:

```env
NEXT_PUBLIC_HR_COACH_URL=http://localhost:8080
```

The HR Coach frontend will connect to this URL when accessed from the main dashboard.

## 🐳 Docker Compose Structure

The integration uses Docker Compose file extension pattern:

**Main stack:**
```bash
docker compose -f docker-compose.yml up
```

**Main stack + HR Coach:**
```bash
docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up
```

Benefits:
- No modifications to existing `docker-compose.yml`
- Easy to enable/disable HR Coach services
- Clean separation of concerns

## 📊 Service Dependencies

```
Main Platform (port 3000)
    ↓
    └─→ HR Coach Page (port 8080 via iframe)
            ↓
            └─→ API Gateway (port 8099)
                    ↓
                    ├─→ Interview Service (8100)
                    ├─→ Calendar Service (8101)
                    ├─→ Analytics Service (8102)
                    ├─→ Media Service (8103)
                    └─→ Reporting Service (8104)
```

## ✔️ Verification

Run the verification script to ensure everything is configured correctly:

```powershell
.\verify-hr-coach-integration.bat
```

Expected output:
```
SUCCESS: Integration verification passed
```

## 🛠️ Development

### Development Mode (Main Platform)

```powershell
cd frontend
npm install
npm run dev          # runs on 3000
```

### Development Mode (HR Coach Frontend)

```powershell
cd frontend/hr-coach
npm install
npm run dev          # runs on 3000
# or
npm run start        # production mode on 8080
```

### Development Mode (HR Coach Backend)

```powershell
cd backend/hr-coach
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run a specific service
cd services/interview
uvicorn main:app --reload --port 8000
```

## 🔗 Integration Point

The main entry point is at:
```
frontend/app/[locale]/dashboard/learner/hr-coach/page.tsx
```

This page:
1. Reads the `NEXT_PUBLIC_HR_COACH_URL` from environment
2. Embeds the HR Coach UI in an iframe
3. Syncs language/locale between platforms
4. Hides language switcher in embedded view

## 📝 Common Tasks

### List running containers
```powershell
docker compose ps
```

### View logs for a service
```powershell
docker compose logs -f hr-coach-frontend
docker compose logs -f hr-coach-interview
```

### Stop services
```powershell
docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml down
```

### Rebuild without cache
```powershell
docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml build --no-cache
```

### Restart a single service
```powershell
docker compose restart hr-coach-frontend
```

## 🐛 Troubleshooting

**HR Coach page shows blank?**
- Check if port 8080 is available: `netstat -ano | findstr :8080`
- Check container logs: `docker logs hr-coach-frontend`

**Services not communicating?**
- Verify API Gateway is running: `docker logs hr-coach-gateway`
- Check network: `docker network ls`

**Database errors?**
- Ensure postgres is running: `docker compose ps postgres`
- Check database URL in environment

**Port already in use?**
- List processes using port: `netstat -ano | findstr :PORT_NUMBER`
- Kill process: `taskkill /PID process_id /F`

## 📚 Additional Documentation

- **Detailed Integration Guide**: `HR_COACH_INTEGRATION.md`
- **Original README**: `backend/hr-coach/README.md`
- **Frontend README**: `frontend/hr-coach/README.md`

## ✨ Next Steps

1. **Verify the integration**: `.\verify-hr-coach-integration.bat`
2. **Start the stack**: `docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up --build`
3. **Test the platform**: Visit http://localhost:3000
4. **Access HR Coach**: Dashboard > CARRIÈRE > Subul HR Coach
5. **Configure production**: Set up environment variables for Azure deployment

---

For questions or issues, refer to the detailed integration guide: `HR_COACH_INTEGRATION.md`
