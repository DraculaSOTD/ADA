#!/bin/bash

# ADA Platform Deployment Script
# This script deploys the ADA application to ada.datapulseai.co

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ADA Platform Deployment Script ===${NC}"
echo -e "${YELLOW}Deploying to: ada.datapulseai.co${NC}\n"

# Step 1: Create deployment directory
echo -e "${YELLOW}Step 1: Creating deployment directory...${NC}"
sudo mkdir -p /srv/http/ada
echo -e "${GREEN}✓ Directory created/verified: /srv/http/ada${NC}\n"

# Step 2: Build the application (if package.json has build script)
echo -e "${YELLOW}Step 2: Building application...${NC}"
if [ -f "package.json" ]; then
    # Check if build script exists
    if grep -q '"build"' package.json; then
        echo "Running npm build..."
        npm run build
        echo -e "${GREEN}✓ Build completed${NC}\n"
    else
        echo -e "${YELLOW}No build script found, assuming static files are ready${NC}\n"
    fi
else
    echo -e "${YELLOW}No package.json found, assuming static deployment${NC}\n"
fi

# Step 3: Copy files to deployment directory
echo -e "${YELLOW}Step 3: Copying files to deployment directory...${NC}"

# Check if dist or build directory exists
if [ -d "dist" ]; then
    echo "Copying from dist directory..."
    sudo cp -r dist/* /srv/http/ada/
elif [ -d "build" ]; then
    echo "Copying from build directory..."
    sudo cp -r build/* /srv/http/ada/
else
    # Copy essential files for static deployment
    echo "Copying static files..."
    sudo cp -r index.html /srv/http/ada/
    sudo cp -r src /srv/http/ada/
    [ -d "pages" ] && sudo cp -r pages /srv/http/ada/
    [ -d "shared" ] && sudo cp -r shared /srv/http/ada/
    [ -f "vite.config.js" ] && sudo cp vite.config.js /srv/http/ada/
fi

echo -e "${GREEN}✓ Files copied to /srv/http/ada${NC}\n"

# Step 4: Set proper permissions
echo -e "${YELLOW}Step 4: Setting permissions...${NC}"
sudo chown -R http:http /srv/http/ada
sudo chmod -R 755 /srv/http/ada
echo -e "${GREEN}✓ Permissions set${NC}\n"

# Step 5: Copy nginx configuration
echo -e "${YELLOW}Step 5: Installing nginx configuration...${NC}"
sudo cp ada.datapulseai.co.nginx /etc/nginx/sites-available/ada.datapulseai.co
echo -e "${GREEN}✓ Configuration copied to /etc/nginx/sites-available/${NC}\n"

# Step 6: Enable the site
echo -e "${YELLOW}Step 6: Enabling nginx site...${NC}"
sudo ln -sf /etc/nginx/sites-available/ada.datapulseai.co /etc/nginx/sites-enabled/
echo -e "${GREEN}✓ Site enabled${NC}\n"

# Step 7: Test nginx configuration
echo -e "${YELLOW}Step 7: Testing nginx configuration...${NC}"
sudo nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}\n"
else
    echo -e "${RED}✗ Nginx configuration test failed!${NC}"
    echo -e "${RED}Please check the configuration and try again.${NC}"
    exit 1
fi

# Step 8: Reload nginx
echo -e "${YELLOW}Step 8: Reloading nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}\n"

# Step 9: SSL Certificate setup reminder
echo -e "${YELLOW}Step 9: SSL Certificate Setup${NC}"
echo -e "To set up SSL certificate with Let's Encrypt, run:"
echo -e "${GREEN}sudo certbot --nginx -d ada.datapulseai.co${NC}\n"

# Step 10: DNS Configuration reminder
echo -e "${YELLOW}Step 10: DNS Configuration${NC}"
echo -e "Please ensure you have added the following DNS record:"
echo -e "Type: A"
echo -e "Name: ada"
echo -e "Value: $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo -e ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "Your site will be available at: ${GREEN}https://ada.datapulseai.co${NC}"
echo -e "(after DNS propagation and SSL setup)\n"

# Optional: Show site status
echo -e "${YELLOW}Checking site status...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://ada.datapulseai.co/health | grep -q "200"; then
    echo -e "${GREEN}✓ Site is responding!${NC}"
else
    echo -e "${YELLOW}Site is not yet accessible. This is normal if DNS/SSL is not configured.${NC}"
fi