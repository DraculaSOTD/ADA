#!/bin/bash

# ADA Platform - Deployment Test Script
# Tests deployment without making any changes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 ADA Platform Deployment Test${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# Test local build
echo -e "${BLUE}📦 Testing Local Build...${NC}"
if [ -d "build" ] && [ -f "build/index.html" ]; then
    echo -e "${GREEN}✓ Build directory exists${NC}"
    echo -e "${GREEN}✓ index.html found${NC}"
    
    if [ -d "build/assets" ]; then
        echo -e "${GREEN}✓ Assets directory found${NC}"
    else
        echo -e "${YELLOW}⚠ No assets directory${NC}"
    fi
else
    echo -e "${RED}✗ No build found - run 'npm run build' first${NC}"
fi

echo ""

# Test required files
echo -e "${BLUE}📁 Checking Required Files...${NC}"
required_files=("package.json" "vite.config.js" "ada.datapulseai.co.nginx" "ada-backend.service" "version.json")

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file missing${NC}"
    fi
done

echo ""

# Test backend directory
echo -e "${BLUE}⚙️  Checking Backend...${NC}"
if [ -d "backend" ]; then
    echo -e "${GREEN}✓ Backend directory exists${NC}"
    
    if [ -f "backend/main.py" ]; then
        echo -e "${GREEN}✓ main.py found${NC}"
    else
        echo -e "${RED}✗ main.py missing${NC}"
    fi
    
    if [ -f "backend/requirements.txt" ]; then
        echo -e "${GREEN}✓ requirements.txt found${NC}"
    else
        echo -e "${RED}✗ requirements.txt missing${NC}"
    fi
    
    if [ -d "backend/venv" ]; then
        echo -e "${GREEN}✓ Virtual environment found${NC}"
    else
        echo -e "${YELLOW}⚠ No virtual environment${NC}"
    fi
else
    echo -e "${RED}✗ Backend directory missing${NC}"
fi

echo ""

# Test current services (if on production server)
echo -e "${BLUE}🔧 Checking Services...${NC}"
if systemctl --version >/dev/null 2>&1; then
    # Check nginx
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx is running${NC}"
    else
        echo -e "${YELLOW}⚠ Nginx is not running${NC}"
    fi
    
    # Check ada-backend service
    if systemctl is-active --quiet ada-backend; then
        echo -e "${GREEN}✓ ADA Backend service is running${NC}"
    else
        echo -e "${YELLOW}⚠ ADA Backend service is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not on a systemd system${NC}"
fi

echo ""

# Test network connectivity
echo -e "${BLUE}🌐 Testing Network...${NC}"
if curl -sf https://ada.datapulseai.co/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Site is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Site not accessible (normal if not deployed yet)${NC}"
fi

if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Local backend is accessible${NC}"
else
    echo -e "${YELLOW}⚠ Local backend not accessible${NC}"
fi

echo ""

# Test permissions
echo -e "${BLUE}🔐 Testing Permissions...${NC}"
if [ -w "/srv" ] 2>/dev/null || sudo -n true 2>/dev/null; then
    echo -e "${GREEN}✓ Have deployment permissions${NC}"
else
    echo -e "${YELLOW}⚠ May need sudo for deployment${NC}"
fi

echo ""

# Summary
echo -e "${CYAN}📋 Summary${NC}"
echo "Ready to deploy? Run:"
echo -e "${GREEN}sudo ./deploy-to-production.sh${NC}"
echo ""
echo "Want to see what would happen without changes?"
echo -e "${GREEN}sudo ./deploy-to-production.sh --dry-run${NC}"
echo ""