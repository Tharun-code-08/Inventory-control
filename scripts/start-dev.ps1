$ErrorActionPreference = "Stop"

function Test-CommandLineRunning {
  param(
    [Parameter(Mandatory = $true)][string]$MatchText
  )

  $procs = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe' OR Name = 'pwsh.exe' OR Name = 'node.exe' OR Name = 'cloudflared.exe'" |
    Where-Object { $_.CommandLine -and $_.CommandLine -match $MatchText }

  return ($procs.Count -gt 0)
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  try {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    return ($listener.Count -gt 0)
  } catch {
    return $false
  }
}

function Test-ApiHealthy {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/health" -TimeoutSec 4
    if ($null -ne $response.ok) {
      return [bool]$response.ok
    }
    if ($response.data -and $null -ne $response.data.ok) {
      return [bool]$response.data.ok
    }
    return $false
  } catch {
    # Health is rate-limited in dev; 429 still means the API process is up.
    if ($_.Exception.Response.StatusCode.value__ -eq 429) {
      return $true
    }
    return $false
  }
}

function Wait-ApiHealthy {
  param(
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-ApiHealthy) {
      return $true
    }
    Start-Sleep -Seconds 5
  }
  return $false
}

function Ensure-ApiEnv {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot
  )

  $envFile = Join-Path $RepoRoot "apps\api\.env"
  if (Test-Path $envFile) {
    return
  }

  Write-Host "apps/api/.env not found - generating credentials..." -ForegroundColor Yellow
  Push-Location $RepoRoot
  try {
    npm run setup:credentials
  } finally {
    Pop-Location
  }
}

function Invoke-PrismaGenerate {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot
  )

  $engineDll = Join-Path $RepoRoot "node_modules\.prisma\client\query_engine-windows.dll.node"

  if ((Test-PortListening -Port 3000) -and (Test-ApiHealthy)) {
    Write-Host "API already running - skipping prisma generate (query engine is in use)." -ForegroundColor DarkYellow
    Write-Host "Stop the RetailIMS API window and re-run this script after Prisma schema changes." -ForegroundColor DarkGray
    return
  }

  npm run prisma --workspace=api -- generate
  if ($LASTEXITCODE -eq 0) {
    return
  }

  if (Test-Path $engineDll) {
    Write-Host ""
    Write-Host "prisma generate failed (EPERM usually means a Node/API process still has the query engine open)." -ForegroundColor DarkYellow
    Write-Host "Continuing with the existing Prisma client. Close the RetailIMS API window and re-run after schema changes." -ForegroundColor DarkYellow
    Write-Host ""
    return
  }

  throw "prisma generate failed and no Prisma query engine was found at $engineDll"
}

function Prepare-Api {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [switch]$SkipMigrate,
    [switch]$SkipGenerate
  )

  Write-Host "Preparing API (Prisma client + schema)..." -ForegroundColor Yellow
  Push-Location $RepoRoot
  try {
    if (-not $SkipGenerate) {
      Invoke-PrismaGenerate -RepoRoot $RepoRoot
    } else {
      Write-Host "Skipping prisma generate (-SkipGenerate)." -ForegroundColor DarkYellow
    }
    if (-not $SkipMigrate) {
      npm run prisma --workspace=api -- migrate deploy
      if ($LASTEXITCODE -ne 0) {
        throw "prisma migrate deploy failed with exit code $LASTEXITCODE"
      }
    } else {
      Write-Host "Skipping prisma migrate deploy (-SkipMigrate)." -ForegroundColor DarkYellow
    }
  } finally {
    Pop-Location
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$skipMigrate = $false
$skipGenerate = $false
if ($args -contains "-SkipMigrate") {
  $skipMigrate = $true
}
if ($args -contains "-SkipGenerate") {
  $skipGenerate = $true
}

Write-Host "Starting Retail IMS stack from $repoRoot" -ForegroundColor Cyan

if (-not (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)) {
  Write-Host "Launching Docker Desktop..." -ForegroundColor Yellow
  Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  Start-Sleep -Seconds 5
}

Write-Host "Waiting for Docker engine..." -ForegroundColor Yellow
$maxAttempts = 30
$ready = $false
for ($i = 1; $i -le $maxAttempts; $i++) {
  try {
    docker info | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  throw "Docker engine did not become ready in time. Open Docker Desktop and retry."
}

Ensure-ApiEnv -RepoRoot $repoRoot

Write-Host "Starting Postgres and Redis..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
  npm run docker:deps
} finally {
  Pop-Location
}

Prepare-Api -RepoRoot $repoRoot -SkipMigrate:$skipMigrate -SkipGenerate:$skipGenerate

if ((Test-PortListening -Port 3000) -and -not (Test-ApiHealthy)) {
  Write-Host ""
  Write-Host "Port 3000 is in use but the API health check failed." -ForegroundColor Red
  Write-Host "Close the old RetailIMS API PowerShell window (failed compile or stale process), then run this script again." -ForegroundColor Red
  Write-Host ""
}

$apiAlreadyHealthy = (Test-PortListening -Port 3000) -and (Test-ApiHealthy)

$tasks = @(
  @{
    Name    = "RetailIMS API"
    IsRunning = { (Test-PortListening -Port 3000) -and (Test-ApiHealthy) }
    Cmd     = "cd `"$repoRoot`"; npm run dev:api"
    WaitFor = $true
  },
  @{
    Name    = "RetailIMS WEB"
    IsRunning = { Test-PortListening -Port 5200 }
    Cmd     = "cd `"$repoRoot`"; npm run dev:web"
    WaitFor = $false
  },
  @{
    Name    = "RetailIMS Tunnel"
    IsRunning = { Test-CommandLineRunning -MatchText "cloudflared tunnel run retail-ims-api" }
    Cmd     = "cd `"$repoRoot`"; cloudflared tunnel run retail-ims-api"
    WaitFor = $false
  }
)

foreach ($task in $tasks) {
  if (& $task.IsRunning) {
    Write-Host "$($task.Name) already running. Skipping." -ForegroundColor DarkYellow
    continue
  }

  Write-Host "Starting $($task.Name)..." -ForegroundColor Green
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $task.Cmd
  ) -WindowStyle Normal

  if ($task.WaitFor) {
    Write-Host "Waiting for API at http://127.0.0.1:3000/api/v1/health ..." -ForegroundColor Yellow
    if (Wait-ApiHealthy -TimeoutSeconds 120) {
      Write-Host "API is healthy." -ForegroundColor Green
    } else {
      Write-Host "API did not become healthy in time. Check the RetailIMS API window for TypeScript or Prisma errors." -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "Startup commands launched." -ForegroundColor Cyan
Write-Host "  Local web:  http://127.0.0.1:5200" -ForegroundColor Cyan
Write-Host "  Local API:  http://127.0.0.1:3000/api/v1/health" -ForegroundColor Cyan
Write-Host "  Login:      admin@retailims.com / Admin@123" -ForegroundColor Cyan
if (-not $apiAlreadyHealthy) {
  Write-Host "  (Wait for the API window to show Nest application successfully started before signing in.)" -ForegroundColor DarkYellow
}
Write-Host ""
Write-Host "Public site (tunnel): https://softdigitconsulting.com" -ForegroundColor Cyan
Write-Host "Optional flags: -SkipMigrate (skip migrate deploy), -SkipGenerate (skip prisma generate)." -ForegroundColor DarkGray
