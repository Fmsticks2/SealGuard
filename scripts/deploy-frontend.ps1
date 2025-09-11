# SealGuard Frontend Deployment Script for Vercel (PowerShell)
# Usage: .\scripts\deploy-frontend.ps1 [production|preview]

param(
    [string]$DeploymentType = "preview"
)

$ErrorActionPreference = "Stop"

$FrontendDir = "src\frontend"

Write-Host "🚀 Starting SealGuard Frontend Deployment..." -ForegroundColor Green
Write-Host "📁 Deployment Type: $DeploymentType" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path $FrontendDir)) {
    Write-Host "❌ Error: Frontend directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Navigate to frontend directory
Set-Location $FrontendDir

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🔍 Running type check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🏗️  Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🧪 Running linting..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Check if Vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "📥 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Green

if ($DeploymentType -eq "production") {
    Write-Host "🚀 Deploying to PRODUCTION..." -ForegroundColor Red
    vercel --prod
} else {
    Write-Host "🔍 Deploying PREVIEW..." -ForegroundColor Cyan
    vercel
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend deployment completed!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Update backend FRONTEND_URL environment variable with the new domain" -ForegroundColor White
    Write-Host "   2. Test the deployment thoroughly" -ForegroundColor White
    Write-Host "   3. Update DNS records if using custom domain" -ForegroundColor White
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Return to project root
Set-Location ..\..

Write-Host "🎉 Deployment process completed!" -ForegroundColor Green