# Smoke test for API endpoints
# Usage: .\scripts\smoke-test-api.ps1 [-Port 3001] [-Timeout 30]

param(
    [int]$Port = 3001,
    [int]$Timeout = 30
)

$baseUrl = "http://localhost:$Port"
$failed = 0

function Test-Endpoint {
    param([string]$Method, [string]$Path, [int]$ExpectStatus = 200)
    $url = "$baseUrl$Path"
    try {
        $response = Invoke-WebRequest -Uri $url -Method $Method -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq $ExpectStatus) {
            Write-Host "[OK] $Method $Path -> $($response.StatusCode)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] $Method $Path -> $($response.StatusCode) (expected $ExpectStatus)" -ForegroundColor Red
            return $false
        }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        if ($status -eq $ExpectStatus) {
            Write-Host "[OK] $Method $Path -> $status" -ForegroundColor Green
            return $true
        }
        Write-Host "[FAIL] $Method $Path -> $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n=== API Smoke Test (port $Port) ===" -ForegroundColor Cyan

# Wait for API
Write-Host "`nWaiting for API..." -ForegroundColor Yellow
$elapsed = 0
while ($elapsed -lt $Timeout) {
    try {
        $null = Invoke-WebRequest -Uri "$baseUrl/" -UseBasicParsing -TimeoutSec 2
        Write-Host "API is up.`n" -ForegroundColor Green
        break
    } catch {
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "  ... ($elapsed s)"
    }
}
if ($elapsed -ge $Timeout) {
    Write-Host "Timeout: API not reachable at $baseUrl" -ForegroundColor Red
    exit 1
}

# Unauthenticated endpoints
if (-not (Test-Endpoint -Method GET -Path "/")) { $failed++ }
if (-not (Test-Endpoint -Method GET -Path "/api/users/test")) { $failed++ }

# Auth endpoints (expect 400/401 without credentials)
$authResult = $true
try {
    $r = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body "{}" -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
    $authResult = ($r.StatusCode -in 400, 401)
} catch {
    $authResult = ($_.Exception.Response.StatusCode.value__ -in 400, 401)
}
if ($authResult) {
    Write-Host "[OK] POST /auth/login -> 400/401 (expected without credentials)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] POST /auth/login" -ForegroundColor Red
    $failed++
}

Write-Host "`n--- Summary ---" -ForegroundColor Cyan
if ($failed -eq 0) {
    Write-Host "All smoke tests passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "$failed test(s) failed." -ForegroundColor Red
    exit 1
}
