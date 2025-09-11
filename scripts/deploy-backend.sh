#!/bin/bash

# SealGuard Backend Deployment Script
# Usage: ./scripts/deploy-backend.sh [railway|render] [production|staging]

set -e

PLATFORM=${1:-railway}
ENVIRONMENT=${2:-staging}
BACKEND_DIR="src/backend"

echo "🚀 Starting SealGuard Backend Deployment..."
echo "🏗️  Platform: $PLATFORM"
echo "🌍 Environment: $ENVIRONMENT"

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to backend directory
cd $BACKEND_DIR

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running type check..."
npm run type-check

echo "🏗️  Building application..."
npm run build

echo "🧪 Running tests..."
npm test

echo "🧹 Running linting..."
npm run lint

if [ "$PLATFORM" = "railway" ]; then
    echo "🚂 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "📥 Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login check
    if ! railway whoami &> /dev/null; then
        echo "🔐 Please login to Railway first:"
        echo "   railway login"
        exit 1
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "🚀 Deploying to PRODUCTION environment..."
        railway up --environment production
    else
        echo "🔍 Deploying to STAGING environment..."
        railway up
    fi
    
elif [ "$PLATFORM" = "render" ]; then
    echo "🎨 Deploying to Render..."
    
    if [ ! -f "render.yaml" ]; then
        echo "❌ Error: render.yaml not found. Please ensure render.yaml is configured."
        exit 1
    fi
    
    echo "📋 Render deployment requires manual setup:"
    echo "   1. Connect your GitHub repository to Render"
    echo "   2. Create a new Web Service"
    echo "   3. Use the render.yaml configuration"
    echo "   4. Set environment variables in Render dashboard"
    echo "   5. Deploy from Render dashboard"
    
else
    echo "❌ Error: Unsupported platform '$PLATFORM'. Use 'railway' or 'render'."
    exit 1
fi

echo "✅ Backend deployment process completed!"
echo "📋 Next steps:"
echo "   1. Verify deployment health at /health endpoint"
echo "   2. Test IPFS upload functionality"
echo "   3. Update frontend NEXT_PUBLIC_BACKEND_URL"
echo "   4. Test end-to-end functionality"
echo "   5. Monitor logs for any issues"

# Return to project root
cd ../..