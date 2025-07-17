@echo off
REM MyBookMyVibe Setup Script for Windows
REM This script sets up the development environment

echo 🚀 Setting up MyBookMyVibe Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo ✓ Node.js is installed

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ npm is not installed. Please install npm
    pause
    exit /b 1
)

echo ✓ npm is installed

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
    echo ✗ Failed to install backend dependencies
    pause
    exit /b 1
)

echo ✓ Backend dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo.
    echo ⚙️ Creating environment configuration...
    copy .env.example .env
    echo ✓ Created .env file from template
    echo ⚠ Please edit backend\.env with your API keys and configuration
) else (
    echo ℹ .env file already exists
)

cd ..

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. 📝 Edit backend\.env with your API keys:
echo    - MongoDB connection string (optional - uses local MongoDB by default)
echo    - Google Books API key (recommended)
echo    - Spotify Client ID and Secret (required for music features)
echo.
echo 2. 🚀 Start the development servers:
echo    Backend:  cd backend ^&^& npm run dev
echo    Frontend: Open public\index.html in your browser or use a static server
echo.
echo 3. 🌐 API will be available at: http://localhost:3001
echo 4. 🎵 Frontend will connect to the API automatically
echo.
echo For more information, see README.md
echo.
echo ✓ Happy coding! 📚🎵
echo.
pause
