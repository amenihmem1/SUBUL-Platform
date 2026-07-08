$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$agents = @(
    @{ name="agent-quiz"; target="quiz-agent"; port=8001 },
    @{ name="agent-roadmap"; target="roadmap-agent"; port=8002 },
    @{ name="agent-cv-booster"; target="cv-booster-agent"; port=8003 },
    @{ name="agent-coach"; target="coach-agent"; port=8004 },
    @{ name="agent-cloud-tutor"; target="cloud-tutor-agent"; port=8000 },
    @{ name="agent-job-search"; target="job-search-agent"; port=8005 }
)

Write-Host "Building agent images sequentially..." -ForegroundColor Cyan

foreach ($agent in $agents) {
    Write-Host "Building $($agent.name)..." -ForegroundColor Yellow
    # Base command: docker build -f backend/agents/Dockerfile --target <target> -t <name> backend/agents
    docker build -f backend/agents/Dockerfile --target $($agent.target) -t $($agent.name) backend/agents
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build $($agent.name)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Write-Host "Images built successfully. Stopping existing agent containers if any..." -ForegroundColor Cyan
foreach ($agent in $agents) {
    docker rm -f $($agent.name) 2>$null
}

Write-Host "Running agent containers..." -ForegroundColor Cyan
foreach ($agent in $agents) {
    Write-Host "Starting $($agent.name) on port $($agent.port)..." -ForegroundColor Yellow
    docker run -d --env-file .env --env-file backend/agents/JobSearch-SUBUL/.env.txt -p "$($agent.port):$($agent.port)" --name $($agent.name) $($agent.name)
}

Write-Host "All agents started. Checking status:" -ForegroundColor Cyan
docker ps -f "name=agent-"
