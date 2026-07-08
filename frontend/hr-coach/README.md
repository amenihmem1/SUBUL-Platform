# Frontend (Next.js)

## Run

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

Backend required:

```bash
# from project root
docker compose up --build api-gateway interview-service calendar-service analytics-service media-service reporting-service
```

Optional backend URL override for proxy routes:

```bash
# in frontend/.env.local
RH_API_BASE_URL=http://127.0.0.1:8000
```

Optional public frontend URL for QR codes and share links:

```bash
# in frontend/.env.local
NEXT_PUBLIC_APP_URL=https://your-public-frontend.example
```

For phone testing on the same network, use a reachable host such as `http://192.168.x.x:3000` and start Next with a network host, for example:

```bash
npm run dev -- --hostname 0.0.0.0
```

The interviewer UI is currently voice-first. Cartesia is the only active TTS provider in the frontend flow.

## Purpose

This frontend provides a RH interview UI to:

- set `session_id`
- upload candidate CV (`pdf/doc/docx/txt/md/png/jpg/webp`) with OCR fallback for scanned files
- send candidate messages
- receive interviewer responses and final report summary
