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

$repoRoot = Split-Path -Parent $PSScriptRoot

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

Write-Host "Starting Postgres and Redis..." -ForegroundColor Yellow
Push-Location $repoRoot
try {
  npm run docker:deps
} finally {
  Pop-Location
}

$tasks = @(
  @{ Name = "RetailIMS API"; IsRunning = { Test-PortListening -Port 3000 }; Cmd = "cd `"$repoRoot`"; npm run dev:api" },
  @{ Name = "RetailIMS WEB"; IsRunning = { Test-PortListening -Port 5200 }; Cmd = "cd `"$repoRoot`"; npm run dev:web" },
  @{ Name = "RetailIMS Tunnel"; IsRunning = { Test-CommandLineRunning -MatchText "cloudflared tunnel run retail-ims-api" }; Cmd = "cd `"$repoRoot`"; cloudflared tunnel run retail-ims-api" }
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
}

Write-Host ""
Write-Host "All startup commands launched." -ForegroundColor Cyan
Write-Host "Open https://softdigitconsulting.com after the servers finish booting." -ForegroundColor Cyan
