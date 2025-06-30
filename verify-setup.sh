#!/bin/bash

# SearXNG Integration Verification Script
# Run this to verify everything is working correctly

echo "🔍 SearXNG Integration Verification"
echo "==================================="

# Test 1: Check if SearXNG is running
echo ""
echo "1️⃣  Checking SearXNG service..."
if curl -s http://localhost:8080/search?q=test&format=json > /dev/null 2>&1; then
    echo "✅ SearXNG is running and responding"
    
    # Get search result count
    RESULTS=$(curl -s 'http://localhost:8080/search?q=programming&format=json' | jq '.results | length' 2>/dev/null || echo "0")
    echo "   📊 Search test returned $RESULTS results"
else
    echo "❌ SearXNG is not responding"
    echo "   Run: cd searxng && docker-compose up -d"
    exit 1
fi

# Test 2: Check if Next.js app is running
echo ""
echo "2️⃣  Checking Next.js application..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Next.js app is running on port 3001"
else
    echo "❌ Next.js app is not running"
    echo "   Run: npm run dev"
    exit 1
fi

# Test 3: Check health check API
echo ""
echo "3️⃣  Checking integration health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/search-crawl)
if echo "$HEALTH_RESPONSE" | jq -e '.healthy == true' > /dev/null 2>&1; then
    echo "✅ Integration health check passed"
    echo "   📡 SearXNG integration is working"
else
    echo "❌ Integration health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test 4: Check if crawler page loads
echo ""
echo "4️⃣  Testing crawler page..."
if curl -s http://localhost:3001/crawler | grep -q "Web Crawler Manager" 2>/dev/null; then
    echo "✅ Crawler page loads successfully"
else
    echo "❌ Crawler page failed to load"
    exit 1
fi

# Test 5: Database connection
echo ""
echo "5️⃣  Checking database..."
if [ -f "prisma/dev.db" ]; then
    echo "✅ Database file exists"
else
    echo "❌ Database file missing"
    echo "   Run: npx prisma db push"
    exit 1
fi

echo ""
echo "🎉 All Systems Operational!"
echo "=========================="
echo ""
echo "🌐 Access URLs:"
echo "   • Main App:    http://localhost:3001"
echo "   • Crawler:     http://localhost:3001/crawler"
echo "   • SearXNG:     http://localhost:8080"
echo ""
echo "🧪 Test Features:"
echo "   1. Register/login at the main app"
echo "   2. Navigate to the Web Crawler page"
echo "   3. Try single URL crawling"
echo "   4. Try bulk search crawling with queries like:"
echo "      • 'artificial intelligence'"
echo "      • 'web development tutorials'"
echo "      • 'machine learning news'"
echo ""
echo "📖 Documentation:"
echo "   • CRAWLER_README.md - Setup instructions"
echo "   • INTEGRATION_COMPLETE.md - Feature overview"
echo ""
echo "✨ Happy crawling!"
