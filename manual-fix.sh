#!/bin/bash

# Manual fix to copy updated files to production
echo "Manually copying updated files to production..."

# Copy the updated AuthPage.html (without test credentials)
sudo cp /home/calvin/Websites/ADA/src/components/AuthPage/AuthPage.html /srv/http/ada/src/components/AuthPage/
echo "✓ Copied AuthPage.html"

# Copy the updated Sidebar.html
sudo cp /home/calvin/Websites/ADA/src/components/Sidebar/Sidebar.html /srv/http/ada/src/components/Sidebar/
echo "✓ Copied Sidebar.html"

# Set proper permissions
sudo chown -R http:http /srv/http/ada/src/
echo "✓ Fixed permissions"

echo "Files updated! Check https://ada.datapulseai.co"