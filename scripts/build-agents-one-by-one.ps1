# Build each agent Docker image sequentially (clear logs; easy to see which step failed).
# Run from repo root:  .\scripts\build-agents-one-by-one.ps1
# Optional: pass service names: .\scripts\build-agents-one-by-one.ps1 agent-coach agent-quiz

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# Light agents first (share base stage), then heavy (cv-booster, job-search use own bases)
$default = @(
  "agent-quiz",
  "agent-roadmap",
  "agent-cloud-tutor",
  "agent-coach",
  "agent-cv-booster",
  "agent-job-search"
)
$services = if ($args.Count -gt 0) { $args } else { $default }

foreach ($svc in $services) {
  Write-Host ""
  Write-Host "========================================" -ForegroundColor Cyan
  Write-Host " Building: $svc" -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor Cyan
  Write-Host ""
  docker compose build --progress=plain $svc
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "FAILED: $svc (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
  Write-Host ""
  Write-Host "OK: $svc" -ForegroundColor Green
}

Write-Host ""
Write-Host "All listed agent images built successfully." -ForegroundColor Green
