$ErrorActionPreference = "Stop"

param(
  [switch]$SkipInstall,
  [switch]$SkipStart
)

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Retail IMS new-machine setup starting..." -ForegroundColor Cyan
Write-Host "Repository: $repoRoot" -ForegroundColor DarkCyan

if (-not $SkipInstall) {
  Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
  npm install
} else {
  Write-Host "Skipping npm install (--SkipInstall)." -ForegroundColor DarkYellow
}

Write-Host "Preparing API credentials..." -ForegroundColor Yellow
npm run setup:credentials

Write-Host "Starting Postgres and Redis with Docker..." -ForegroundColor Yellow
npm run docker:deps

Write-Host "Running Prisma migrations..." -ForegroundColor Yellow
npm run prisma --workspace=api -- migrate deploy

Write-Host "Seeding database (includes admin@retailims.com / Admin@123)..." -ForegroundColor Yellow
npm run prisma --workspace=api -- db seed

if (-not $SkipStart) {
  Write-Host "Starting API + Web..." -ForegroundColor Yellow
  npm run dev
} else {
  Write-Host "Setup complete. Start app manually with: npm run dev" -ForegroundColor Green
}
