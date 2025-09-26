# ADA Platform Deployment Instructions

## What We've Accomplished Locally

✅ **Fixed Production Build Issues**
- Updated Vite configuration for proper production builds
- Fixed module loading issues in index.html
- Successfully building to `build/` directory
- Preview server works correctly with API proxy

✅ **Prepared Production Configuration**
- Updated nginx config (`ada.datapulseai.co.nginx`) with API proxying enabled
- Created systemd service file (`ada-backend.service`) for backend
- Updated deployment script to handle build directory

✅ **Version Management**
- Version bumped to 1.0.0
- Updated footer text in AuthPage and Sidebar components
- Created version.json for runtime version info

## What Needs to Be Done on Production Server

### 1. Deploy Frontend Files
```bash
# On production server, copy these files to /srv/http/ada/
/home/calvin/Websites/ADA/build/index.html
/home/calvin/Websites/ADA/build/assets/
/home/calvin/Websites/ADA/src/
/home/calvin/Websites/ADA/version.json

# Set permissions
sudo chown -R http:http /srv/http/ada
sudo chmod -R 755 /srv/http/ada
```

### 2. Deploy Backend Service
```bash
# Copy backend files to production server
rsync -av /home/calvin/Websites/ADA/backend/ production-server:/srv/ada-backend/

# Copy systemd service file
sudo cp /home/calvin/Websites/ADA/ada-backend.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ada-backend
sudo systemctl start ada-backend
```

### 3. Update Nginx Configuration
```bash
# Copy the updated nginx config
sudo cp /home/calvin/Websites/ADA/ada.datapulseai.co.nginx /etc/nginx/sites-available/ada.datapulseai.co

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Verify Deployment
```bash
# Check backend service
sudo systemctl status ada-backend
curl https://ada.datapulseai.co/api/health

# Check frontend
curl https://ada.datapulseai.co/health
curl https://ada.datapulseai.co/version.json
```

## Key Changes Made

1. **Vite Configuration**: Added preview proxy support and proper production asset handling
2. **Nginx Config**: Enabled API proxying to localhost:8000, added CORS headers
3. **Build Process**: Fixed module loading and build output directory issues
4. **Version Display**: Footer now shows "Version 1.0.0" on login page and sidebar

## Expected Result

After deployment, your live site at https://ada.datapulseai.co should:
- Load the same as your local `npm run dev` experience
- Have working API calls through nginx proxy
- Display version 1.0.0 in the footer
- Support all existing functionality

## Troubleshooting

If API calls don't work:
1. Check backend service: `sudo systemctl status ada-backend`
2. Check nginx logs: `sudo tail -f /var/log/nginx/ada.datapulseai-error.log`
3. Test direct backend: `curl localhost:8000/health`

The local preview server can be used for testing:
- `npm run build && npm run preview` should work identically to production