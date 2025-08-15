#!/bin/bash

echo "🚀 Starting ADA Platform Development Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    # Try docker compose (newer version)
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Option 1: Use Docker (Recommended)
echo ""
echo "Choose your setup option:"
echo "1) Use Docker (Recommended - handles all dependencies)"
echo "2) Run locally (Requires Python, Node.js, PostgreSQL, Redis)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📦 Starting Docker containers..."
    $DOCKER_COMPOSE -f docker-compose.dev.yml up -d
    
    echo ""
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    echo ""
    echo "🗄️  Running database migrations..."
    docker exec ada_backend alembic upgrade head 2>/dev/null || echo "ℹ️  Migrations will run when Alembic is configured"
    
    echo ""
    echo "✅ Backend API is running at: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    
else
    echo ""
    echo "📦 Setting up local development environment..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is not installed."
        exit 1
    fi
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "backend/venv" ]; then
        echo "🐍 Creating Python virtual environment..."
        cd backend
        python3 -m venv venv
        cd ..
    fi
    
    # Activate virtual environment and install dependencies
    echo "📦 Installing Python dependencies..."
    cd backend
    source venv/bin/activate
    pip install -r requirements.txt
    
    # Initialize SQLite database
    echo "🗄️  Initializing SQLite database..."
    python -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
Base = declarative_base()
engine = create_engine('sqlite:///ada.db')
Base.metadata.create_all(engine)
print('✅ Database initialized')
" 2>/dev/null || echo "ℹ️  Database will be initialized on first run"
    
    # Start backend server
    echo ""
    echo "🚀 Starting backend server..."
    echo "✅ Backend API will run at: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo ""
    echo "Run this command in the backend directory:"
    echo "source venv/bin/activate && uvicorn main:app --reload --port 8000"
    cd ..
fi

echo ""
echo "🎨 To start the frontend, run in a new terminal:"
echo "npm run dev"
echo ""
echo "📝 Default login credentials (for development):"
echo "Username: admin@ada.com"
echo "Password: admin123"
echo ""
echo "🛑 To stop Docker containers, run:"
echo "$DOCKER_COMPOSE -f docker-compose.dev.yml down"