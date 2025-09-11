#!/bin/bash

# SealGuard Frontend Deployment Script for Vercel
# Usage: ./scripts/deploy-frontend.sh [production|preview]

set -e

DEPLOYMENT_TYPE=${1:-preview}
FRONTEND_DIR="src/frontend"

echo "🚀 Starting SealGuard Frontend Deployment..."
echo "📁 Deployment Type: $DEPLOYMENT_TYPE"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: Frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Navigate to frontend directory
cd $FRONTEND_DIR

echo "📦 Installing dependencies..."
npm ci

echo "🔍 Running type check..."
npm run type-check

echo "🏗️  Building application..."
npm run build

echo "🧪 Running linting..."
npm run lint

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📥 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🌐 Deploying to Vercel..."

if [ "$DEPLOYMENT_TYPE" = "production" ]; then
    echo "🚀 Deploying to PRODUCTION..."
    vercel --prod
else
    echo "🔍 Deploying PREVIEW..."
    vercel
fi

echo "✅ Frontend deployment completed!"
echo "📋 Next steps:"
echo "   1. Update backend FRONTEND_URL environment variable with the new domain"
echo "   2. Test the deployment thoroughly"
echo "   3. Update DNS records if using custom domain"

# Return to project root
cd ../..