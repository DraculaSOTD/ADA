#!/bin/bash

echo "🚀 Starting ADA Backend Server..."

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Set environment to use SQLite for simplicity
export USE_SQLITE=true
export SQLITE_DB_PATH=./ada.db

# Create uploads directory if it doesn't exist
mkdir -p uploads logs

echo ""
echo "✅ Starting FastAPI server..."
echo "📚 API Documentation will be available at: http://localhost:8000/docs"
echo "🔗 API Base URL: http://localhost:8000"
echo ""

# Start the server
uvicorn main:app --reload --port 8000 --host 0.0.0.0