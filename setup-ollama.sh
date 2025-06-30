#!/bin/bash

echo "🦙 Ollama Setup for Local Llama Models"
echo "======================================"
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed."
    echo ""
    echo "🔧 Installing Ollama..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "📱 Detected macOS - Installing via curl..."
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "🐧 Detected Linux - Installing via curl..."
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "❌ Unsupported OS. Please install Ollama manually from https://ollama.ai"
        exit 1
    fi
    
    echo "✅ Ollama installed successfully!"
else
    echo "✅ Ollama is already installed"
fi

echo ""
echo "🚀 Starting Ollama service..."

# Start Ollama service in background
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - start as background service
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    echo "Started Ollama service (PID: $OLLAMA_PID)"
else
    # Linux - start with systemd if available, otherwise background
    if command -v systemctl &> /dev/null; then
        sudo systemctl start ollama
        echo "Started Ollama service via systemctl"
    else
        ollama serve > /dev/null 2>&1 &
        OLLAMA_PID=$!
        echo "Started Ollama service (PID: $OLLAMA_PID)"
    fi
fi

# Wait for service to start
echo "⏳ Waiting for Ollama service to start..."
sleep 3

# Check if service is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama service is running"
else
    echo "❌ Failed to start Ollama service"
    exit 1
fi

echo ""
echo "📦 Installing recommended Llama models..."
echo ""

# Install Llama2 (default model)
echo "🔽 Downloading Llama2 (7B) - this may take a while..."
ollama pull llama2

# Install a smaller model for faster responses
echo "🔽 Downloading Llama2:7b-chat - optimized for chat..."
ollama pull llama2:7b-chat

# Install Code Llama for coding tasks
echo "🔽 Downloading Code Llama (7B) for coding assistance..."
ollama pull codellama

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Available models:"
ollama list

echo ""
echo "⚙️  Configuration:"
echo "   • Ollama Host: http://localhost:11434"
echo "   • Default Model: llama2"
echo "   • Service Status: Running"
echo ""
echo "🔧 Environment Variables (already configured in .env.local):"
echo "   OLLAMA_HOST=http://localhost:11434"
echo "   OLLAMA_MODEL=llama2"
echo ""
echo "💡 Tips:"
echo "   • Use 'llama2:7b-chat' for better conversation"
echo "   • Use 'codellama' for programming help"
echo "   • Run 'ollama list' to see all installed models"
echo "   • Run 'ollama ps' to see running models"
echo "   • Models are stored in ~/.ollama/models"
echo ""
echo "🚀 You can now use the 'Llama (Local)' option in the AI Chatbot!"
echo "   No API keys required - everything runs locally!"
