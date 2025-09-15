#!/bin/bash

# Backend service startup script for ADA
# Can be run manually or as a systemd service

BACKEND_DIR="/home/calvin/Websites/ADA/backend"
LOG_FILE="/home/calvin/Websites/ADA/backend/logs/backend.log"
PID_FILE="/home/calvin/Websites/ADA/backend/backend.pid"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if backend is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0  # Running
        else
            rm -f "$PID_FILE"  # Clean up stale PID file
            return 1  # Not running
        fi
    fi
    return 1  # Not running
}

# Function to start backend
start_backend() {
    if check_running; then
        echo -e "${YELLOW}⚠️  Backend is already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi

    echo -e "${GREEN}🚀 Starting ADA Backend Server...${NC}"
    
    cd "$BACKEND_DIR" || exit 1
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    echo -e "${YELLOW}🐍 Activating virtual environment...${NC}"
    source venv/bin/activate
    
    # Install/update dependencies
    if [ -f "requirements.txt" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        pip install -q -r requirements.txt
    fi
    
    # Set environment variables
    export USE_SQLITE=true
    export SQLITE_DB_PATH=./ada.db
    
    # Create necessary directories
    mkdir -p uploads logs
    
    # Start the server in background
    echo -e "${GREEN}✅ Starting FastAPI server...${NC}"
    nohup uvicorn main:app --reload --port 8000 --host 0.0.0.0 > "$LOG_FILE" 2>&1 &
    
    # Save PID
    echo $! > "$PID_FILE"
    
    sleep 2  # Give it time to start
    
    if check_running; then
        echo -e "${GREEN}✅ Backend started successfully!${NC}"
        echo -e "${GREEN}📚 API Documentation: http://localhost:8000/docs${NC}"
        echo -e "${GREEN}🔗 API Base URL: http://localhost:8000${NC}"
        echo -e "${GREEN}📝 Logs: $LOG_FILE${NC}"
        echo -e "${GREEN}🔢 PID: $(cat $PID_FILE)${NC}"
    else
        echo -e "${RED}❌ Failed to start backend${NC}"
        echo -e "${RED}Check logs at: $LOG_FILE${NC}"
        return 1
    fi
}

# Function to stop backend
stop_backend() {
    if ! check_running; then
        echo -e "${YELLOW}⚠️  Backend is not running${NC}"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    echo -e "${YELLOW}🛑 Stopping backend (PID: $PID)...${NC}"
    
    kill "$PID"
    sleep 2
    
    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}Force killing...${NC}"
        kill -9 "$PID"
    fi
    
    rm -f "$PID_FILE"
    echo -e "${GREEN}✅ Backend stopped${NC}"
}

# Function to restart backend
restart_backend() {
    stop_backend
    sleep 1
    start_backend
}

# Function to show status
status_backend() {
    if check_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ Backend is running (PID: $PID)${NC}"
        echo -e "${GREEN}📚 API Documentation: http://localhost:8000/docs${NC}"
        echo -e "${GREEN}🔗 API Base URL: http://localhost:8000${NC}"
        
        # Show last few log lines
        if [ -f "$LOG_FILE" ]; then
            echo -e "\n${YELLOW}Recent log entries:${NC}"
            tail -5 "$LOG_FILE"
        fi
    else
        echo -e "${RED}❌ Backend is not running${NC}"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    status)
        status_backend
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo ""
        echo "  start   - Start the backend server"
        echo "  stop    - Stop the backend server"
        echo "  restart - Restart the backend server"
        echo "  status  - Show backend status"
        exit 1
        ;;
esac