#!/bin/bash

# Image Processor - Quick Setup Script
# This script sets up the development environment

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        Image Processor - Development Setup                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Setup backend
echo "📦 Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install > /dev/null 2>&1
fi

echo "✓ Backend setup complete"
echo ""

# Create uploads directory
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    echo "✓ Created uploads directory"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ Created .env (edit with your settings)"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ Setup Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 To start the development server:"
echo ""
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "📖 To view the web UI demo:"
echo ""
echo "   cd demo"
echo "   npx http-server"
echo ""
echo "   Then open: http://localhost:8080"
echo ""
echo "📋 First API call:"
echo ""
echo "   curl -X POST http://localhost:3000/api/process/transform \\"
echo "     -F \"image=@sample.jpg\" \\"
echo "     -F 'operations=[{\"type\":\"grayscale\"}]' \\"
echo "     -F \"outputFormat=png\""
echo ""
echo "📚 Documentation:"
echo "   - Main README: ../README.md"
echo "   - Architecture: ../documentation/ARCHITECTURE.md"
echo "   - API Spec: ./API_SPECIFICATION.yaml"
echo ""
