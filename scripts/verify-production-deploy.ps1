# Verify production (or staging) API matches current Nest routes.
#
# Without JWT, protected routes must return 401 Unauthorized (meaning the route exists).
# 404 "Cannot GET/POST /api/..." means the deployed backend image is missing that controller (rebuild + redeploy backend).
#
# Image digest (run when kubeconfig points at the cluster):
#   kubectl get deployment backend -n subul -o jsonpath="{.spec.template.spec.containers[0].image}"
#   kubectl describe pod -n subul -l app=backend | Select-String -Pattern "Image:"
#
# Exam rows in Postgres (see scripts/check-exam-count.sql):
#   kubectl exec -n subul deploy/postgres -- psql -U <user> -d <db> -f - < scripts/check-exam-count.sql
#
# API pod seed/migration logs (backend/api/docker-entrypoint.sh):
#   kubectl logs -n subul deploy/backend --tail=300 | Select-String "api-entrypoint|Seed|migration"
#
# Usage:
#   .\scripts\verify-production-deploy.ps1
#   .\scripts\verify-production-deploy.ps1 -BaseUrl "https://app.example.com"

param(
    [string]$BaseUrl = "https://app.subul.uk"
)

$ErrorActionPreference = "Stop"
$base = $BaseUrl.TrimEnd("/")
$failed = 0

function Get-StatusCode {
    param([string]$Method, [string]$Path)
    $url = "$base$Path"
    try {
        $null = Invoke-WebRequest -Uri $url -Method $Method -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
        return 200
    } catch {
        $r = $_.Exception.Response
        if ($r) { return [int]$r.StatusCode }
        return -1
    }
}

Write-Host "`n=== Production deploy verification ===" -ForegroundColor Cyan
Write-Host "Base: $base`n"

# Baseline: this route existed on older backends; without auth we expect 401.
$exams = Get-StatusCode -Method GET -Path "/api/exams"
if ($exams -eq 401) {
    Write-Host "[OK] GET /api/exams -> 401 (route registered, auth required)" -ForegroundColor Green
} elseif ($exams -eq 404) {
    Write-Host "[FAIL] GET /api/exams -> 404 (backend missing exams module - critical)" -ForegroundColor Red
    $failed++
} else {
    Write-Host "[WARN] GET /api/exams -> $exams (expected 401 without token)" -ForegroundColor Yellow
}

$routes = @(
    @{ Method = "GET";  Path = "/api/learner/certifications/issued"; Name = "learner certifications issued" }
    @{ Method = "GET";  Path = "/api/learner-emploi/jobs"; Name = "learner-emploi jobs" }
    @{ Method = "POST"; Path = "/api/job-search/chat/reset"; Name = "job-search chat reset" }
)

foreach ($r in $routes) {
    $code = Get-StatusCode -Method $r.Method -Path $r.Path
    if ($code -eq 401) {
        Write-Host "[OK] $($r.Method) $($r.Path) -> 401 ($($r.Name))" -ForegroundColor Green
    } elseif ($code -eq 404) {
        Write-Host "[FAIL] $($r.Method) $($r.Path) -> 404 - redeploy backend image with current repo (missing route)" -ForegroundColor Red
        $failed++
    } else {
        Write-Host "[WARN] $($r.Method) $($r.Path) -> $code (expected 401 without JWT)" -ForegroundColor Yellow
    }
}

Write-Host "`n--- Summary ---" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "All checked routes are registered (401 without credentials)." -ForegroundColor Green
    exit 0
}
Write-Host "$failed route(s) returned 404 - backend image is stale or wrong deployment." -ForegroundColor Red
exit 1
