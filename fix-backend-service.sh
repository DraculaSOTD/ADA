#!/bin/bash

# ADA Backend Service Fix Script
# Fixes the backend service deployment issue

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔧 ADA Backend Service Fix${NC}"
echo -e "${CYAN}===========================${NC}"
echo ""

# Configuration
BACKEND_DIR="/srv/ada-backend"
SERVICE_NAME="ada-backend"

log_info() {
    echo -e "${CYAN}ℹ  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Stop the service
echo -e "${BLUE}1. Stopping ada-backend service...${NC}"
systemctl stop $SERVICE_NAME 2>/dev/null || true
log_success "Service stopped"

# Step 2: Remove broken virtual environment
echo -e "${BLUE}2. Removing broken virtual environment...${NC}"
if [ -d "$BACKEND_DIR/venv" ]; then
    rm -rf "$BACKEND_DIR/venv"
    log_success "Broken venv removed"
else
    log_info "No venv to remove"
fi

# Step 3: Create new virtual environment
echo -e "${BLUE}3. Creating new virtual environment...${NC}"
cd "$BACKEND_DIR"
python3 -m venv venv
log_success "New virtual environment created"

# Step 4: Install requirements
echo -e "${BLUE}4. Installing requirements...${NC}"
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
log_success "Requirements installed"

# Step 5: Update systemd service file
echo -e "${BLUE}5. Updating systemd service file...${NC}"
cat > /etc/systemd/system/ada-backend.service << 'EOF'
[Unit]
Description=ADA Platform Backend API
After=network.target

[Service]
Type=simple
User=http
Group=http
WorkingDirectory=/srv/ada-backend
Environment=PATH=/srv/ada-backend/venv/bin
Environment=USE_SQLITE=true
Environment=SQLITE_DB_PATH=./ada.db
ExecStart=/srv/ada-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
log_success "Service file updated"

# Step 6: Set proper ownership
echo -e "${BLUE}6. Setting proper ownership...${NC}"
chown -R http:http "$BACKEND_DIR"
log_success "Ownership set"

# Step 7: Reload systemd and start service
echo -e "${BLUE}7. Starting service...${NC}"
systemctl daemon-reload
systemctl start $SERVICE_NAME

# Wait a moment for service to start
sleep 3

# Step 8: Verify service is running
if systemctl is-active --quiet $SERVICE_NAME; then
    log_success "Backend service is now running!"
    
    # Test the endpoint
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
    fi
else
    log_error "Service failed to start"
    echo ""
    echo "Service status:"
    systemctl status $SERVICE_NAME --no-pager
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Backend service fix completed successfully!${NC}"
echo ""
echo "You can now:"
echo -e "• Check service status: ${CYAN}sudo systemctl status ada-backend${NC}"
echo -e "• View logs: ${CYAN}sudo journalctl -u ada-backend -f${NC}"
echo -e "• Test backend: ${CYAN}curl http://localhost:8000/health${NC}"
echo ""