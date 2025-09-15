#!/bin/bash

# Quick deployment script for ADA Platform
# For when you just want to push changes without all the bells and whistles

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Quick Deploying ADA...${NC}"

# Get version
VERSION_FILE="/home/calvin/Websites/ADA/.deployment-version"
if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE")
    VERSION=$((VERSION + 1))
else
    VERSION=1
fi

# Update version in files
DATE=$(date '+%Y-%m-%d %H:%M')
sed -i "s|<div class=\"footer-text\">.*</div>|<div class=\"footer-text\">Built by Ava, powered by DataPulse AI | v$VERSION | $DATE</div>|g" /home/calvin/Websites/ADA/src/components/AuthPage/AuthPage.html
sed -i "s|<p class=\"copyright\">.*</p>|<p class=\"copyright\">Built by Ava, powered by DataPulseAI | v$VERSION</p>|g" /home/calvin/Websites/ADA/src/components/Sidebar/Sidebar.html

# Copy files
echo -n "Copying files..."
sudo cp -r /home/calvin/Websites/ADA/index.html /srv/http/ada/
sudo cp -r /home/calvin/Websites/ADA/src /srv/http/ada/
[ -d "/home/calvin/Websites/ADA/dist" ] && sudo cp -r /home/calvin/Websites/ADA/dist/* /srv/http/ada/ 2>/dev/null || true
[ -d "/home/calvin/Websites/ADA/assets" ] && sudo cp -r /home/calvin/Websites/ADA/assets /srv/http/ada/ 2>/dev/null || true
echo -e " ${GREEN}✓${NC}"

# Set permissions
sudo chown -R http:http /srv/http/ada
sudo chmod -R 755 /srv/http/ada

# Update version file
echo "$VERSION" > "$VERSION_FILE"

echo -e "${GREEN}✅ Deployed v$VERSION successfully!${NC}"
echo -e "View at: https://ada.datapulseai.co"