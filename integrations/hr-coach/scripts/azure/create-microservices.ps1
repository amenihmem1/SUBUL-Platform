param(
  [string]$ResourceGroup = "rh-agent-rg",
  [string]$Location = "francecentral",
  [string]$PlanName = "rh-agent-linux-plan",
  [string]$AcrName = "rhagentacr",
  [string]$Sku = "B1",
  [string]$FrontendUrl = "https://rh-frontend-gsbqdfgncrhdewcn.centralus-01.azurewebsites.net",
  [string]$DatabaseUrl = "",
  [string]$OpenAiApiKey = "",
  [string]$AzureOpenAiApiKey = "",
  [string]$AzureOpenAiEndpoint = "",
  [string]$DeepgramApiKey = "",
  [string]$SttLanguage = "multi",
  [string]$SttModel = "nova-3",
  [string]$SttRequestTimeoutS = "25",
  [string]$SttConnectTimeoutS = "8",
  [string]$SttReadTimeoutS = "25",
  [string]$SttWriteTimeoutS = "25",
  [string]$SttMaxAttempts = "1",
  [string]$SttRetryBackoffS = "0.5",
  [string]$CartesiaApiKey = "",
  [string]$CartesiaModel = "sonic-3",
  [string]$CartesiaVoiceId = "a8a1eb38-5f15-4c1d-8722-7ac0f329727d",
  [string]$CartesiaLanguage = "multi",
  [string]$AzureStorageConnectionString = "",
  [string]$AzureStorageCvContainer = "cv-files",
  [string]$AzureStorageReportsContainer = "reports",
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

function Invoke-Az {
  $Arguments = $args
  & az @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Azure CLI command failed: az $($Arguments -join ' ')"
  }
}

function Get-AzValueOrNull {
  $Arguments = $args
  $oldErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & az @Arguments 2>$null
    if ($LASTEXITCODE -eq 0 -and $output) {
      return ($output | Select-Object -First 1)
    }
    return $null
  } finally {
    $ErrorActionPreference = $oldErrorActionPreference
  }
}

function Set-AppSettings {
  param(
    [string]$Name,
    [hashtable]$Settings
  )

  $pairs = @()
  foreach ($key in $Settings.Keys) {
    $value = [string]$Settings[$key]
    if ($value.Length -gt 0) {
      $pairs += "$key=$value"
    }
  }

  if ($pairs.Count -gt 0) {
    Invoke-Az webapp config appsettings set `
      --resource-group $ResourceGroup `
      --name $Name `
      --settings $pairs | Out-Null
  }
}

$existingGroupLocation = Get-AzValueOrNull group show --name $ResourceGroup --query location -o tsv
if ($existingGroupLocation) {
  Write-Host "Using existing resource group $ResourceGroup in $existingGroupLocation..."
  $Location = $existingGroupLocation
} else {
  Write-Host "Creating resource group $ResourceGroup in $Location..."
  Invoke-Az group create --name $ResourceGroup --location $Location | Out-Null
}

$existingPlan = Get-AzValueOrNull appservice plan show --name $PlanName --resource-group $ResourceGroup --query name -o tsv
if ($existingPlan) {
  Write-Host "Using existing Linux App Service plan $PlanName..."
} else {
  Write-Host "Creating Linux App Service plan $PlanName..."
  Invoke-Az appservice plan create `
    --name $PlanName `
    --resource-group $ResourceGroup `
    --location $Location `
    --is-linux `
    --sku $Sku | Out-Null
}

$existingAcr = Get-AzValueOrNull acr show --name $AcrName --resource-group $ResourceGroup --query name -o tsv
if ($existingAcr) {
  Write-Host "Using existing Azure Container Registry $AcrName..."
  Invoke-Az acr update `
    --resource-group $ResourceGroup `
    --name $AcrName `
    --admin-enabled true | Out-Null
} else {
  Write-Host "Creating Azure Container Registry $AcrName..."
  Invoke-Az acr create `
    --resource-group $ResourceGroup `
    --name $AcrName `
    --location $Location `
    --sku Basic `
    --admin-enabled true | Out-Null
}

$acrLoginServer = Invoke-Az acr show --name $AcrName --resource-group $ResourceGroup --query loginServer -o tsv
$acrUsername = Invoke-Az acr credential show --name $AcrName --query username -o tsv
$acrPassword = Invoke-Az acr credential show --name $AcrName --query "passwords[0].value" -o tsv

$services = @(
  @{ Name = "rh-interview-service"; Image = "rh-interview-service" },
  @{ Name = "rh-media-service"; Image = "rh-media-service" },
  @{ Name = "rh-analytics-service"; Image = "rh-analytics-service" },
  @{ Name = "rh-reporting-service"; Image = "rh-reporting-service" },
  @{ Name = "rh-calendar-service"; Image = "rh-calendar-service" },
  @{ Name = "rh-api-gateway"; Image = "rh-api-gateway" }
)

foreach ($service in $services) {
  $name = $service.Name
  $image = "$acrLoginServer/$($service.Image):latest"

  $existingWebApp = Get-AzValueOrNull webapp show --resource-group $ResourceGroup --name $name --query name -o tsv
  if ($existingWebApp) {
    Write-Host "Using existing Web App for Container $name..."
  } else {
    Write-Host "Creating Web App for Container $name..."
    Invoke-Az webapp create `
      --resource-group $ResourceGroup `
      --plan $PlanName `
      --name $name `
      --deployment-container-image-name $image | Out-Null
  }

  Invoke-Az webapp config container set `
    --resource-group $ResourceGroup `
    --name $name `
    --docker-custom-image-name $image `
    --docker-registry-server-url "https://$acrLoginServer" `
    --docker-registry-server-user $acrUsername `
    --docker-registry-server-password $acrPassword | Out-Null

  Set-AppSettings -Name $name -Settings @{
    WEBSITES_PORT = "8000"
    WEBSITE_WEBDEPLOY_USE_SCM = "true"
    DOCKER_ENABLE_CI = "true"
    WEBSITES_CONTAINER_START_TIME_LIMIT = "1800"
    SCM_COMMAND_IDLE_TIMEOUT = "1800"
    DOCKER_REGISTRY_SERVER_URL = "https://$acrLoginServer"
    DOCKER_REGISTRY_SERVER_USERNAME = $acrUsername
    DOCKER_REGISTRY_SERVER_PASSWORD = $acrPassword
  }

  Invoke-Az webapp deployment container config `
    --resource-group $ResourceGroup `
    --name $name `
    --enable-cd true | Out-Null
}

if (-not $SkipFrontend) {
  $existingFrontend = Get-AzValueOrNull webapp show --resource-group $ResourceGroup --name "rh-frontend" --query name -o tsv
  if ($existingFrontend) {
    Write-Host "Using existing Node.js Web App rh-frontend..."
  } else {
    Write-Host "Creating Node.js Web App rh-frontend..."
    Invoke-Az webapp create `
      --resource-group $ResourceGroup `
      --plan $PlanName `
      --name "rh-frontend" `
      --runtime "NODE:20-lts" | Out-Null
  }

  Set-AppSettings -Name "rh-frontend" -Settings @{
    RH_API_BASE_URL = "https://rh-api-gateway.azurewebsites.net"
    RH_MEDIA_BASE_URL = "https://rh-media-service.azurewebsites.net"
    NEXT_PUBLIC_APP_URL = $FrontendUrl
    NEXT_PUBLIC_REPORT_SHARE_BASE_URL = $FrontendUrl
    WEBSITE_WEBDEPLOY_USE_SCM = "true"
    WEBSITE_NODE_DEFAULT_VERSION = "~20"
  }
}

Write-Host "Configuring gateway routing..."
Set-AppSettings -Name "rh-api-gateway" -Settings @{
  INTERVIEW_SERVICE_URL = "https://rh-interview-service.azurewebsites.net"
  MEDIA_SERVICE_URL = "https://rh-media-service.azurewebsites.net"
  ANALYTICS_SERVICE_URL = "https://rh-analytics-service.azurewebsites.net"
  REPORTING_SERVICE_URL = "https://rh-reporting-service.azurewebsites.net"
  CALENDAR_SERVICE_URL = "https://rh-calendar-service.azurewebsites.net"
}

$backendSettings = @{
  DATABASE_URL = $DatabaseUrl
  SESSION_STORE_REQUIRE_POSTGRES = "true"
  SESSION_STORE_ALLOW_JSON_FALLBACK = "false"
  PUBLIC_APP_URL = $FrontendUrl
  CORS_ALLOW_ORIGINS = $FrontendUrl
  OPENAI_API_KEY = $OpenAiApiKey
  AZURE_OPENAI_API_KEY = $AzureOpenAiApiKey
  AZURE_OPENAI_ENDPOINT = $AzureOpenAiEndpoint
  INTERVIEW_SERVICE_URL = "https://rh-interview-service.azurewebsites.net"
  DEEPGRAM_API_KEY = $DeepgramApiKey
  STT_LANGUAGE = $SttLanguage
  STT_MODEL = $SttModel
  STT_REQUEST_TIMEOUT_S = $SttRequestTimeoutS
  STT_CONNECT_TIMEOUT_S = $SttConnectTimeoutS
  STT_READ_TIMEOUT_S = $SttReadTimeoutS
  STT_WRITE_TIMEOUT_S = $SttWriteTimeoutS
  STT_MAX_ATTEMPTS = $SttMaxAttempts
  STT_RETRY_BACKOFF_S = $SttRetryBackoffS
  CARTESIA_API_KEY = $CartesiaApiKey
  CARTESIA_MODEL = $CartesiaModel
  CARTESIA_VOICE_ID = $CartesiaVoiceId
  CARTESIA_LANGUAGE = $CartesiaLanguage
  EMOTION_BACKEND_PROVIDER = "custom"
  CUSTOM_EMOTION_MODEL_DIR = "/app/data/models/emotion/efficientnet_b3_20260425_053142"
  AZURE_STORAGE_ENABLED = "true"
  AZURE_STORAGE_CONNECTION_STRING = $AzureStorageConnectionString
  AZURE_STORAGE_CV_CONTAINER = $AzureStorageCvContainer
  AZURE_STORAGE_REPORTS_CONTAINER = $AzureStorageReportsContainer
}

foreach ($name in @("rh-interview-service", "rh-media-service", "rh-analytics-service", "rh-reporting-service", "rh-calendar-service")) {
  Write-Host "Configuring backend settings for $name..."
  Set-AppSettings -Name $name -Settings $backendSettings
}

Set-AppSettings -Name "rh-calendar-service" -Settings @{
  INTERVIEW_CALENDAR_REQUIRE_POSTGRES = "true"
}

Write-Host ""
Write-Host "Done. Add these GitHub Actions secrets:"
Write-Host "AZURE_CONTAINER_REGISTRY_LOGIN_SERVER=$acrLoginServer"
Write-Host "AZURE_CONTAINER_REGISTRY_USERNAME=$acrUsername"
Write-Host "AZURE_CONTAINER_REGISTRY_PASSWORD=<hidden>"
Write-Host ""
Write-Host "Download publish profiles for:"
foreach ($service in $services) {
  Write-Host "- $($service.Name)"
}
if (-not $SkipFrontend) {
  Write-Host "- rh-frontend"
}
Write-Host ""
Write-Host "Set rh-frontend app settings:"
Write-Host "RH_API_BASE_URL=https://rh-api-gateway.azurewebsites.net"
Write-Host "NEXT_PUBLIC_APP_URL=$FrontendUrl"
Write-Host "NEXT_PUBLIC_REPORT_SHARE_BASE_URL=$FrontendUrl"
