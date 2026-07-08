@echo off
REM HR Coach Integration Verification Script
REM Simple batch version for cross-platform compatibility

setlocal enabledelayedexpansion

echo.
echo ========== HR COACH INTEGRATION VERIFICATION ==========
echo.

set passed=0
set failed=0
set warnings=0

REM Check directories
echo [DIRECTORIES]
if exist "backend\hr-coach" (
    echo  OK: backend\hr-coach exists
    set /a passed+=1
) else (
    echo  FAILED: backend\hr-coach missing
    set /a failed+=1
)

if exist "frontend\hr-coach" (
    echo  OK: frontend\hr-coach exists
    set /a passed+=1
) else (
    echo  FAILED: frontend\hr-coach missing
    set /a failed+=1
)

if exist "backend\hr-coach\services" (
    echo  OK: backend\hr-coach\services exists
    set /a passed+=1
) else (
    echo  FAILED: backend\hr-coach\services missing
    set /a failed+=1
)

REM Check configuration files
echo.
echo [CONFIGURATION FILES]
if exist "docker-compose.yml" (
    echo  OK: docker-compose.yml found
    set /a passed+=1
) else (
    echo  FAILED: docker-compose.yml missing
    set /a failed+=1
)

if exist "docker-compose.hr-coach.yml" (
    echo  OK: docker-compose.hr-coach.yml found
    set /a passed+=1
) else (
    echo  FAILED: docker-compose.hr-coach.yml missing
    set /a failed+=1
)

if exist "HR_COACH_INTEGRATION.md" (
    echo  OK: HR_COACH_INTEGRATION.md found
    set /a passed+=1
) else (
    echo  FAILED: HR_COACH_INTEGRATION.md missing
    set /a failed+=1
)

if exist "backend\hr-coach\requirements.txt" (
    echo  OK: backend\hr-coach\requirements.txt found
    set /a passed+=1
) else (
    echo  FAILED: backend\hr-coach\requirements.txt missing
    set /a failed+=1
)

if exist "frontend\hr-coach\package.json" (
    echo  OK: frontend\hr-coach\package.json found
    set /a passed+=1
) else (
    echo  FAILED: frontend\hr-coach\package.json missing
    set /a failed+=1
)

REM Check integration point
echo.
echo [INTEGRATION POINTS]
if exist "frontend\app\[locale]\dashboard\learner\hr-coach\page.tsx" (
    echo  OK: HR Coach page integration found
    set /a passed+=1
) else (
    echo  FAILED: HR Coach page integration missing
    set /a failed+=1
)

REM Check environment
echo.
echo [ENVIRONMENT CONFIGURATION]
if exist "frontend\.env.local" (
    echo  OK: frontend\.env.local exists
    set /a passed+=1
    
    findstr /M "NEXT_PUBLIC_HR_COACH_URL" "frontend\.env.local" >nul
    if !errorlevel! equ 0 (
        echo  OK: NEXT_PUBLIC_HR_COACH_URL configured
        set /a passed+=1
    ) else (
        echo  WARNING: NEXT_PUBLIC_HR_COACH_URL not found
        set /a warnings+=1
    )
) else (
    echo  WARNING: frontend\.env.local not found
    set /a warnings+=1
)

REM Summary
echo.
echo ========== VERIFICATION SUMMARY ==========
echo Passed:   !passed!
echo Warnings: !warnings!
echo Failed:   !failed!
echo.

if !failed! equ 0 (
    echo SUCCESS: Integration verification passed!
    echo.
    echo Next steps:
    echo  1. docker compose -f docker-compose.yml -f docker-compose.hr-coach.yml up --build
    echo  2. Open http://localhost:3000
    echo  3. Navigate to Dashboard ^> Carriere ^> Subul HR Coach
) else (
    echo FAILED: Please review the errors above.
)

echo.
endlocal
