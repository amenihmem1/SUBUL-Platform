# dev.ps1 -- Start backend in Docker + frontend in hot-reload dev mode
# Usage: .\dev.ps1

Write-Host "Starting backend services in Docker..." -ForegroundColor Cyan

docker compose up -d postgres redis api `
  agent-cloud-tutor agent-quiz agent-roadmap `
  agent-cv-booster agent-job-search agent-coach

Write-Host ""
Write-Host "Backend ready. Starting frontend in dev mode..." -ForegroundColor Green
Write-Host "Open http://localhost:3000 -- changes reflect instantly." -ForegroundColor Yellow
Write-Host ""

Set-Location frontend
npm run dev
