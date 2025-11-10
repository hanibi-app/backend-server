#!/bin/bash

# Hanibi Backend Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Build and start containers
echo "🏗️  Building and starting containers..."
docker compose build --no-cache
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check if app is running
if docker compose ps | grep -q "hanibi-backend.*Up"; then
    echo "✅ Deployment successful!"
    echo "📊 Application is running at http://localhost:3000"
    echo "📖 API docs available at http://localhost:3000/docs"
    
    # Show logs
    echo ""
    echo "📋 Recent logs:"
    docker compose logs --tail=20 app
else
    echo "❌ Deployment failed! Check logs:"
    docker compose logs app
    exit 1
fi

