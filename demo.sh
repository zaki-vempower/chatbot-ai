#!/bin/bash

echo "🎉 AI Chatbot Demo Setup"
echo "======================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found. Please run ./setup.sh first"
    exit 1
fi

echo "🔧 Setting up demo environment..."

# Generate secure secrets if not already done
if grep -q "your-secret-key-here" .env.local; then
    echo "🔐 Generating secure secrets..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    sed -i '' "s/NEXTAUTH_SECRET=\"your-secret-key-here\"/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env.local
    sed -i '' "s/JWT_SECRET=\"your-jwt-secret-here\"/JWT_SECRET=\"$JWT_SECRET\"/" .env.local
fi

echo "✅ Environment configured"

# Check if any AI API keys are set or if Ollama is available
has_api_key=false
has_ollama=false
if [ -n "$(grep 'OPENAI_API_KEY=' .env.local | cut -d'"' -f2)" ]; then has_api_key=true; fi
if [ -n "$(grep 'ANTHROPIC_API_KEY=' .env.local | cut -d'"' -f2)" ]; then has_api_key=true; fi
if [ -n "$(grep 'GOOGLE_API_KEY=' .env.local | cut -d'"' -f2)" ]; then has_api_key=true; fi
if [ -n "$(grep 'DEEPSEEK_API_KEY=' .env.local | cut -d'"' -f2)" ]; then has_api_key=true; fi

# Check if Ollama is running
if command -v ollama &> /dev/null && curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    has_ollama=true
fi

echo ""
echo "🚀 Starting the application..."
echo ""

if [ "$has_api_key" = false ] && [ "$has_ollama" = false ]; then
    echo "⚠️  WARNING: No AI providers detected!"
    echo "   To use AI chat functionality, either:"
    echo "   1. Add API keys to .env.local:"
    echo ""
    echo "      OPENAI_API_KEY=\"your-key-here\""
    echo "      ANTHROPIC_API_KEY=\"your-key-here\""
    echo "      GOOGLE_API_KEY=\"your-key-here\""
    echo "      DEEPSEEK_API_KEY=\"your-key-here\""
    echo ""
    echo "   2. OR setup local AI (no API keys required):"
    echo "      ./setup-ollama.sh"
    echo ""
    echo "   You can still test the UI and authentication features."
    echo ""
fi

echo "📖 Demo Features Available:"
echo "   ✅ User registration and login"
echo "   ✅ Beautiful responsive UI"
echo "   ✅ Conversation management"
echo "   ✅ Web crawler (works without API keys)"
if [ "$has_api_key" = true ] || [ "$has_ollama" = true ]; then
    echo "   ✅ AI chat functionality"
    if [ "$has_ollama" = true ]; then
        echo "   ✅ Local Llama AI (no API costs!)"
    fi
else
    echo "   ⚠️  AI chat (requires API keys or Ollama setup)"
fi
echo ""
echo "🌐 Application will be available at:"
echo "   http://localhost:3000"
echo ""
echo "📱 Test the following workflows:"
echo "   1. Register a new user account"
echo "   2. Try crawling a website (e.g., https://en.wikipedia.org/wiki/Artificial_intelligence)"
echo "   3. Start a conversation and ask about the crawled content"
echo "   4. Test different AI providers if you have API keys"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm run dev
