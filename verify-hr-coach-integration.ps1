#!/usr/bin/env powershell
<#
.SYNOPSIS
    Verify HR Coach integration with the Subul Platform
.DESCRIPTION
    Checks directory structure, configuration files, and running services
#>

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          HR COACH INTEGRATION VERIFICATION SCRIPT              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Color scheme
$success = "Green"
$error = "Red"
$warning = "Yellow"
$info = "Cyan"

# Counters
$passed = 0
$failed = 0
$warnings = 0

# Test functions
function Test-File {
    param([string]$path, [string]$description)
    if (Test-Path $path) {
        Write-Host "  ✓ $description" -ForegroundColor $success
        $script:passed++
    } else {
        Write-Host "  ✗ $description (NOT FOUND: $path)" -ForegroundColor $error
        $script:failed++
    }
}

function Test-Directory {
    param([string]$path, [string]$description)
    if (Test-Path $path -PathType Container) {
        Write-Host "  ✓ $description" -ForegroundColor $success
        $script:passed++
    } else {
        Write-Host "  ✗ $description (NOT FOUND: $path)" -ForegroundColor $error
        $script:failed++
    }
}

function Test-Port {
    param([int]$port, [string]$description)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "  ⚠ $description (ALREADY IN USE on port $port)" -ForegroundColor $warning
            $script:warnings++
        } else {
            Write-Host "  ✓ $description (port $port available)" -ForegroundColor $success
            $script:passed++
        }
    } catch {
        Write-Host "  ✓ $description (port $port available)" -ForegroundColor $success
        $script:passed++
    }
}

function Check-DockerImage {
    param([string]$image)
    try {
        $output = docker image inspect $image 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Docker image found: $image" -ForegroundColor $success
            $script:passed++
        } else {
            Write-Host "  ⚠ Docker image not built: $image" -ForegroundColor $warning
            $script:warnings++
        }
    } catch {
        Write-Host "  ⚠ Docker not available or image not built: $image" -ForegroundColor $warning
        $script:warnings++
    }
}

# Get project root
$projectRoot = (Get-Location).Path
if (-not (Test-Path "$projectRoot/docker-compose.yml")) {
    $projectRoot = "$projectRoot/subul-platform-main"
}

Write-Host "Project Root: $projectRoot" -ForegroundColor $info
Write-Host ""

# === DIRECTORY STRUCTURE ===
Write-Host "📁 Directory Structure" -ForegroundColor $info
Test-Directory "$projectRoot/backend/hr-coach" "Backend HR Coach folder"
Test-Directory "$projectRoot/frontend/hr-coach" "Frontend HR Coach folder"
Test-Directory "$projectRoot/backend/hr-coach/services" "Backend microservices folder"
Test-Directory "$projectRoot/backend/hr-coach/core" "Backend core modules"
Test-Directory "$projectRoot/frontend/hr-coach/app" "Frontend Next.js app"
Write-Host ""

# === CONFIGURATION FILES ===
Write-Host "⚙️ Configuration Files" -ForegroundColor $info
Test-File "$projectRoot/docker-compose.yml" "Main docker-compose.yml"
Test-File "$projectRoot/docker-compose.hr-coach.yml" "HR Coach extension compose file"
Test-File "$projectRoot/HR_COACH_INTEGRATION.md" "Integration documentation"
Test-File "$projectRoot/backend/hr-coach/requirements.txt" "Backend requirements.txt"
Test-File "$projectRoot/frontend/hr-coach/package.json" "Frontend package.json"
Test-File "$projectRoot/frontend/.env.local" "Frontend environment config"
Write-Host ""

# === INTEGRATION FILES ===
Write-Host "🔗 Integration Points" -ForegroundColor $info
Test-File "$projectRoot/frontend/app/[locale]/dashboard/learner/hr-coach/page.tsx" "HR Coach dashboard page"
Write-Host ""

# === PORT AVAILABILITY ===
Write-Host "🔌 Port Availability" -ForegroundColor $info
Test-Port 3000 "Main Frontend"
Test-Port 3001 "Backend API"
Test-Port 8080 "HR Coach Frontend"
Test-Port 8099 "HR Coach API Gateway"
Test-Port 8100 "HR Coach Interview Service"
Test-Port 8101 "HR Coach Calendar Service"
Test-Port 8102 "HR Coach Analytics Service"
Test-Port 8103 "HR Coach Media Service"
Test-Port 8104 "HR Coach Reporting Service"
Test-Port 5434 "PostgreSQL Database"
Write-Host ""

# === DOCKER IMAGES ===
Write-Host "🐳 Docker Images" -ForegroundColor $info
Check-DockerImage "subul-platform-main-api:latest"
Check-DockerImage "subul-platform-main-hr-coach-frontend:latest"
Check-DockerImage "subul-platform-main-hr-coach-interview:latest"
Write-Host ""

# === ENVIRONMENT VARIABLES ===
Write-Host "🔑 Environment Variables" -ForegroundColor $info
if (Test-Path "$projectRoot/frontend/.env.local") {
    $envContent = Get-Content "$projectRoot/frontend/.env.local"
    if ($envContent -match "NEXT_PUBLIC_HR_COACH_URL") {
        Write-Host "  ✓ NEXT_PUBLIC_HR_COACH_URL configured" -ForegroundColor $success
        $passed++
    } else {
        Write-Host "  ⚠ NEXT_PUBLIC_HR_COACH_URL not found in .env.local" -ForegroundColor $warning
        $warnings++
    }
} else {
    Write-Host "  ✗ .env.local not found" -ForegroundColor $error
    $failed++
}
Write-Host ""

# === HEALTH CHECKS ===
Write-Host "💚 Service Health Checks" -ForegroundColor $info
try {
    $response = curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" -m 2
    if ($response -eq "200" -or $response -eq "302" -or $response -eq "301") {
        Write-Host "  ✓ Main platform responding (HTTP $response)" -ForegroundColor $success
        $passed++
    } else {
        Write-Host "  ⚠ Main platform returning HTTP $response" -ForegroundColor $warning
        $warnings++
    }
} catch {
    Write-Host "  ⚠ Main platform not accessible (docker compose may not be running)" -ForegroundColor $warning
    $warnings++
}

try {
    $response = curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080" -m 2
    if ($response -eq "200" -or $response -eq "302" -or $response -eq "301") {
        Write-Host "  ✓ HR Coach frontend responding (HTTP $response)" -ForegroundColor $success
        $passed++
    } else {
        Write-Host "  ⚠ HR Coach frontend returning HTTP $response" -ForegroundColor $warning
        $warnings++
    }
} catch {
    Write-Host "  ⚠ HR Coach frontend not accessible" -ForegroundColor $warning
    $warnings++
}
Write-Host ""

# === SUMMARY ===
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      VERIFICATION SUMMARY                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✓ Passed:   $passed" -ForegroundColor $success
Write-Host "  ⚠ Warnings: $warnings" -ForegroundColor $warning
Write-Host "  ✗ Failed:   $failed" -ForegroundColor $error
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ Integration verification complete! Ready to run." -ForegroundColor $success
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor $info
    Write-Host "  1. Start the stack with HR Coach:" -ForegroundColor $info
    Write-Host "     docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up --build" -ForegroundColor $info
    Write-Host "  2. Access the platform at http://localhost:3000" -ForegroundColor $info
    Write-Host "  3. Navigate to Dashboard > Carrière > Subul HR Coach" -ForegroundColor $info
} else {
    Write-Host "⚠️ Some checks failed. Please review the output above." -ForegroundColor $warning
}
Write-Host ""
