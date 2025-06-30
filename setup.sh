#!/bin/bash

echo "🚀 Setting up AI Chatbot..."

# Generate random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Update .env.local with generated secrets
sed -i '' "s/NEXTAUTH_SECRET=\"your-secret-key-here\"/NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"/" .env.local
sed -i '' "s/JWT_SECRET=\"your-jwt-secret-here\"/JWT_SECRET=\"$JWT_SECRET\"/" .env.local

echo "✅ Generated secure secrets"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🗄️  Setting up database..."
npx prisma generate

echo "✅ Setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1a. For cloud AI providers, add API keys to .env.local:"
echo "    - OPENAI_API_KEY=\"your-openai-key\""
echo "    - ANTHROPIC_API_KEY=\"your-anthropic-key\""
echo "    - GOOGLE_API_KEY=\"your-google-key\""
echo "    - DEEPSEEK_API_KEY=\"your-deepseek-key\""
echo ""
echo "1b. OR setup local AI (no API keys required!):"
echo "    ./setup-ollama.sh"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Features:"
echo "   - Multi-AI provider support (OpenAI, Claude, Gemini, DeepSeek, Llama Local)"
echo "   - User authentication and conversation history"
echo "   - Web crawling for knowledge injection"
echo "   - Beautiful UI with shadcn/ui components"
