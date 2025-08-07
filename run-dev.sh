#!/bin/bash

# DataPulse V2 Development Server Launcher
echo "========================================="
echo "Starting DataPulse V2 development servers"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}Stopping development servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    if [ -n "$VENV_CREATED" ] && [ "$VENV_CREATED" = "true" ]; then
        deactivate 2>/dev/null
    fi
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Check and setup Python virtual environment
echo -e "${GREEN}Setting up Python environment...${NC}"
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv backend/venv
    VENV_CREATED=true
fi

# Activate virtual environment
source backend/venv/bin/activate

# Install Python dependencies if needed
echo -e "${GREEN}Checking Python dependencies...${NC}"
if ! python -c "import fastapi, pandas" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -r backend/requirements.txt
fi

# Check if npm dependencies are installed
echo -e "${GREEN}Checking npm dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Start backend server in a subshell
echo -e "${GREEN}Starting Python backend...${NC}"
(
    cd backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend server
echo -e "${GREEN}Starting Vite frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for servers to start
sleep 3

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Development servers started!${NC}"
echo -e "Frontend: ${YELLOW}http://localhost:5173${NC} (or 5174 if port is in use)"
echo -e "Backend:  ${YELLOW}http://localhost:8000${NC}"
echo -e "API Docs: ${YELLOW}http://localhost:8000/docs${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Press ${RED}Ctrl+C${NC} to stop both servers"

# Wait for processes
wait