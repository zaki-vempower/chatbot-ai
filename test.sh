#!/bin/bash

echo "🧪 AI Chatbot Testing Suite"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    echo "Testing: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        local actual_status=0
    else
        local actual_status=1
    fi
    
    if [ "$actual_status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Function to test HTTP endpoint
test_endpoint() {
    local endpoint="$1"
    local method="$2"
    local expected_status="$3"
    local data="$4"
    
    echo "Testing endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "http://localhost:3000$endpoint")
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
            "http://localhost:3000$endpoint")
    fi
    
    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $endpoint returns $response"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $endpoint returned $response, expected $expected_status"
        ((TESTS_FAILED++))
    fi
    echo ""
}

echo "🔧 Pre-flight checks..."
echo ""

# Check if Node.js is installed
run_test "Node.js installation" "node --version" 0

# Check if npm is installed
run_test "npm installation" "npm --version" 0

# Check if dependencies are installed
run_test "Dependencies installed" "test -d node_modules" 0

# Check if database exists
run_test "Database file exists" "test -f prisma/dev.db" 0

# Check if .env.local exists
run_test "Environment file exists" "test -f .env.local" 0

# Check if build works
echo "🏗️  Build tests..."
echo ""
run_test "TypeScript compilation" "npm run build" 0

# Check if server starts (background)
echo "🚀 Server tests..."
echo ""

# Start server in background for testing
echo "Starting development server for testing..."
npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test if server is responding
run_test "Server is running" "curl -s http://localhost:3000 > /dev/null" 0

# Test API endpoints
echo "🔌 API endpoint tests..."
echo ""

test_endpoint "/" "GET" 200
test_endpoint "/api/auth/register" "POST" 400 '{"invalid": "data"}'
test_endpoint "/api/auth/login" "POST" 400 '{"invalid": "data"}'

# Test with valid registration data
echo "Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}' \
    "http://localhost:3000/api/auth/register")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✅ PASS${NC}: User registration successful"
    ((TESTS_PASSED++))
    
    # Extract token for further tests
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    # Test authenticated endpoints
    echo "Testing authenticated endpoints..."
    
    # Test conversations endpoint
    CONV_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "http://localhost:3000/api/conversations")
    
    if echo "$CONV_RESPONSE" | grep -q "conversations"; then
        echo -e "${GREEN}✅ PASS${NC}: Conversations endpoint works"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: Conversations endpoint failed"
        ((TESTS_FAILED++))
    fi
    
else
    echo -e "${RED}❌ FAIL${NC}: User registration failed"
    ((TESTS_FAILED++))
fi
echo ""

# Test crawling endpoint with a simple URL
echo "Testing web crawler..."
CRAWL_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"url":"https://httpbin.org/html"}' \
    "http://localhost:3000/api/crawl")

if echo "$CRAWL_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ PASS${NC}: Web crawler works"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: Web crawler test (may require internet)"
fi
echo ""

# Kill the server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "📊 Test Results"
echo "==============="
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your chatbot is ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start the server: npm run dev"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Register a new account and start chatting!"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
    exit 1
fi
