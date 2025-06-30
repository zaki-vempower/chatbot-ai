#!/bin/bash

# SearXNG Setup Script for Development
# This script helps set up SearXNG locally for the web crawler

echo "🔍 SearXNG Setup for Web Crawler"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is available"

# Create searxng directory if it doesn't exist
if [ ! -d "searxng" ]; then
    echo "📁 Creating searxng directory..."
    mkdir searxng
fi

cd searxng

# Download docker-compose.yaml if it doesn't exist
if [ ! -f "docker-compose.yaml" ]; then
    echo "📥 Downloading SearXNG docker-compose.yaml..."
    curl -s https://raw.githubusercontent.com/searxng/searxng-docker/master/docker-compose.yaml -o docker-compose.yaml
fi

# Download .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📥 Downloading SearXNG .env file..."
    curl -s https://raw.githubusercontent.com/searxng/searxng-docker/master/.env -o .env
    
    # Generate random secret key
    SECRET_KEY=$(openssl rand -hex 32)
    sed -i.bak "s/SEARXNG_SECRET=.*/SEARXNG_SECRET=${SECRET_KEY}/" .env
    rm .env.bak 2>/dev/null || true
    echo "🔑 Generated random secret key"
fi

# Check if SearXNG is already running
if docker-compose ps | grep -q "searxng.*Up"; then
    echo "✅ SearXNG is already running!"
    echo "🌐 Access it at: http://localhost:8080"
    echo "🧪 Test the API: curl 'http://localhost:8080/search?q=test&format=json'"
    echo ""
    echo "📖 You can now use the bulk crawler feature in the web app!"
    exit 0
fi

echo "🚀 Starting SearXNG..."
docker-compose up -d

# Wait for SearXNG to be ready
echo "⏳ Waiting for SearXNG to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8080/search?q=test&format=json > /dev/null 2>&1; then
        echo "✅ SearXNG is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Test if SearXNG is working
if curl -s http://localhost:8080/search?q=test&format=json > /dev/null 2>&1; then
    echo ""
    echo "🎉 SearXNG Setup Complete!"
    echo "================================"
    echo "🌐 SearXNG URL: http://localhost:8080"
    echo "🧪 Test API: curl 'http://localhost:8080/search?q=test&format=json'"
    echo "📊 Admin: http://localhost:8080/stats"
    echo ""
    echo "📖 You can now use the bulk crawler feature in the web app!"
    echo "   1. Go to http://localhost:3001/crawler"
    echo "   2. Enter a search query like 'AI news' or 'machine learning'"
    echo "   3. Click 'Bulk Crawl' to crawl up to 20 websites"
    echo ""
    echo "🛑 To stop SearXNG: cd searxng && docker-compose down"
else
    echo "❌ SearXNG failed to start properly"
    echo "📋 Check logs: cd searxng && docker-compose logs"
    exit 1
fi
