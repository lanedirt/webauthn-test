#!/bin/bash

# WebAuthn Test Docker Start Script
# This script helps you quickly start the application with Docker

set -e

echo "🔐 WebAuthn Test Application - Docker Deployment"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker from https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed."
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if data directory exists
if [ ! -d "./data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p ./data
fi

echo "🏗️  Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting application..."
docker-compose up -d

echo ""
echo "⏳ Waiting for application to be ready..."
sleep 5

# Check if container is running
if docker-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Application is running!"
    echo ""
    echo "📍 Access the application at: http://localhost:3000"
    echo ""
    echo "Useful commands:"
    echo "  - View logs:    docker-compose logs -f"
    echo "  - Stop app:     docker-compose down"
    echo "  - Restart:      docker-compose restart"
    echo "  - View status:  docker-compose ps"
    echo ""
else
    echo ""
    echo "❌ Failed to start application. Check logs with:"
    echo "   docker-compose logs"
    exit 1
fi
