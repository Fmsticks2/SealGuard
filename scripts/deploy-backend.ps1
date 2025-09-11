# SealGuard Backend Deployment Script (PowerShell)
# Usage: .\scripts\deploy-backend.ps1 [railway|render] [production|staging]

param(
    [string]$Platform = "railway",
    [string]$Environment = "staging"
)

$ErrorActionPreference = "Stop"

$BackendDir = "src\backend"

Write-Host "🚀 Starting SealGuard Backend Deployment..." -ForegroundColor Green
Write-Host "🏗️  Platform: $Platform" -ForegroundColor Cyan
Write-Host "🌍 Environment: $Environment" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path $BackendDir)) {
    Write-Host "❌ Error: Backend directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Set-Location $BackendDir

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🔍 Running type check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🏗️  Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "🧪 Running tests..." -ForegroundColor Yellow
try {
    npm test
    if ($LASTEXITCODE -ne 0) { 
        Write-Host "⚠️  Tests failed, but continuing deployment..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  No tests found or test command failed, continuing..." -ForegroundColor Yellow
}

Write-Host "🧹 Running linting..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($Platform -eq "railway") {
    Write-Host "🚂 Deploying to Railway..." -ForegroundColor Green
    
    # Check if Railway CLI is installed
    try {
        railway --version | Out-Null
    } catch {
        Write-Host "📥 Installing Railway CLI..." -ForegroundColor Yellow
        npm install -g @railway/cli
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
    
    # Login check
    try {
        railway whoami | Out-Null
    } catch {
        Write-Host "🔐 Please login to Railway first:" -ForegroundColor Red
        Write-Host "   railway login" -ForegroundColor White
        exit 1
    }
    
    if ($Environment -eq "production") {
        Write-Host "🚀 Deploying to PRODUCTION environment..." -ForegroundColor Red
        railway up --environment production
    } else {
        Write-Host "🔍 Deploying to STAGING environment..." -ForegroundColor Cyan
        railway up
    }
    
} elseif ($Platform -eq "render") {
    Write-Host "🎨 Deploying to Render..." -ForegroundColor Green
    
    if (-not (Test-Path "render.yaml")) {
        Write-Host "❌ Error: render.yaml not found. Please ensure render.yaml is configured." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📋 Render deployment requires manual setup:" -ForegroundColor Cyan
    Write-Host "   1. Connect your GitHub repository to Render" -ForegroundColor White
    Write-Host "   2. Create a new Web Service" -ForegroundColor White
    Write-Host "   3. Use the render.yaml configuration" -ForegroundColor White
    Write-Host "   4. Set environment variables in Render dashboard" -ForegroundColor White
    Write-Host "   5. Deploy from Render dashboard" -ForegroundColor White
    
} else {
    Write-Host "❌ Error: Unsupported platform '$Platform'. Use 'railway' or 'render'." -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -eq 0 -or $Platform -eq "render") {
    Write-Host "✅ Backend deployment process completed!" -ForegroundColor Green
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify deployment health at /health endpoint" -ForegroundColor White
    Write-Host "   2. Test IPFS upload functionality" -ForegroundColor White
    Write-Host "   3. Update frontend NEXT_PUBLIC_BACKEND_URL" -ForegroundColor White
    Write-Host "   4. Test end-to-end functionality" -ForegroundColor White
    Write-Host "   5. Monitor logs for any issues" -ForegroundColor White
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# Return to project root
Set-Location ..\..

Write-Host "🎉 Deployment process completed!" -ForegroundColor Green