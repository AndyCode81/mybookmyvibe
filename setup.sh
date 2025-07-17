#!/bin/bash

# MyBookMyVibe Setup Script
# This script sets up the development environment

echo "🚀 Setting up MyBookMyVibe Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

print_status "Node.js $(node --version) is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm"
    exit 1
fi

print_status "npm $(npm --version) is installed"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
if npm install; then
    print_status "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "⚙️ Creating environment configuration..."
    cp .env.example .env
    print_status "Created .env file from template"
    print_warning "Please edit backend/.env with your API keys and configuration"
else
    print_info ".env file already exists"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. 📝 Edit backend/.env with your API keys:"
echo "   - MongoDB connection string (optional - uses local MongoDB by default)"
echo "   - Google Books API key (recommended)"
echo "   - Spotify Client ID and Secret (required for music features)"
echo ""
echo "2. 🚀 Start the development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: Open public/index.html in your browser or use a static server"
echo ""
echo "3. 🌐 API will be available at: http://localhost:3001"
echo "4. 🎵 Frontend will connect to the API automatically"
echo ""
echo "For more information, see README.md"
echo ""
print_status "Happy coding! 📚🎵"
