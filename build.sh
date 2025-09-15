#!/bin/bash

# ADA Platform Build Script
# Prepares the application for deployment

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Building ADA Platform ===${NC}\n"

# Check if we need to install dependencies
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}\n"
    
    # Check for build script
    if grep -q '"build"' package.json; then
        echo -e "${YELLOW}Running build script...${NC}"
        npm run build
        echo -e "${GREEN}✓ Build completed${NC}\n"
    fi
fi

# Create a dist directory if it doesn't exist
if [ ! -d "dist" ] && [ ! -d "build" ]; then
    echo -e "${YELLOW}Creating dist directory for static files...${NC}"
    mkdir -p dist
    
    # Copy all necessary files to dist
    cp index.html dist/
    cp -r src dist/
    [ -d "pages" ] && cp -r pages dist/
    [ -d "shared" ] && cp -r shared dist/
    [ -f "vite.config.js" ] && cp vite.config.js dist/
    
    echo -e "${GREEN}✓ Static files prepared in dist directory${NC}\n"
fi

echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "Ready for deployment. Run ${YELLOW}./deploy-ada.sh${NC} to deploy.\n"