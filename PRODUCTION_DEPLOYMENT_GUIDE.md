# ADA Platform Production Deployment Guide

## 🚀 Quick Start

To deploy your changes to https://ada.datapulseai.co, simply run:

```bash
sudo ./deploy-to-production.sh
```

The script will prompt you for a version number and handle everything else automatically.

## 📋 What the Script Does

### ✅ Complete Automation
1. **Version Management**: Updates version in footer, creates version.json
2. **Frontend Build**: Runs `npm run build` to create production assets
3. **Frontend Deployment**: Copies built files to `/srv/http/ada/`
4. **Backend Service**: Installs and starts the ada-backend systemd service
5. **Nginx Configuration**: Updates nginx with API proxy configuration
6. **Verification**: Tests all endpoints and services

### 🎯 Single Command Deployment
- Builds from your current codebase
- Deploys both frontend and backend
- Configures nginx for API proxying
- Verifies everything is working
- Shows you exactly what endpoints are available

## 🛠 Command Options

```bash
# Full deployment (recommended)
sudo ./deploy-to-production.sh

# Quick deployment (skip build, use existing files)
sudo ./deploy-to-production.sh --skip-build

# Skip backup creation
sudo ./deploy-to-production.sh --no-backup

# Skip backend service deployment
sudo ./deploy-to-production.sh --skip-backend

# Skip nginx configuration
sudo ./deploy-to-production.sh --skip-nginx

# See what would happen without making changes
sudo ./deploy-to-production.sh --dry-run

# Show help
./deploy-to-production.sh --help
```

## 📊 Version Management

The script will:
1. Ask for a new version number (e.g., 1.0.1, 2.0.0)
2. Update the footer text in AuthPage and Sidebar components
3. Create a version.json file with deployment info
4. Display the version on your live site

## 🔧 What Gets Deployed

### Frontend Files (to `/srv/http/ada/`)
- `index.html` (built by Vite)
- `assets/` (CSS, JS, images)
- `src/` (component files)
- `version.json` (version info)

### Backend Service
- FastAPI backend running on port 8000
- Systemd service: `ada-backend`
- SQLite database with your data
- Auto-restart on failure

### Nginx Configuration
- API proxy: `/api/*` → `localhost:8000`
- Static file serving for frontend
- CORS headers for cross-origin requests
- SSL termination (if certificates are configured)

## 🌐 Live Endpoints

After deployment, these URLs will be available:

- **Main Site**: https://ada.datapulseai.co/
- **API**: https://ada.datapulseai.co/api/
- **API Documentation**: https://ada.datapulseai.co/docs
- **Health Check**: https://ada.datapulseai.co/health
- **Version Info**: https://ada.datapulseai.co/version.json

## 🔍 Verification & Monitoring

### Check Services
```bash
# Backend service status
sudo systemctl status ada-backend

# Backend logs
sudo journalctl -u ada-backend -f

# Nginx status
sudo systemctl status nginx

# Nginx error logs
sudo tail -f /var/log/nginx/ada.datapulseai-error.log
```

### Test Endpoints
```bash
# Test backend directly
curl http://localhost:8000/health

# Test frontend
curl https://ada.datapulseai.co/health

# Test API proxy
curl https://ada.datapulseai.co/api/tokens/balance

# Check version
curl https://ada.datapulseai.co/version.json
```

## 🆘 Troubleshooting

### Backend Not Starting
```bash
# Check service status and logs
sudo systemctl status ada-backend
sudo journalctl -u ada-backend -n 50

# Restart backend
sudo systemctl restart ada-backend
```

### API Calls Failing
```bash
# Check nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx logs
sudo tail -f /var/log/nginx/ada.datapulseai-error.log
```

### Build Failures
```bash
# Check Node.js version
node --version

# Clean and rebuild
rm -rf build/ node_modules/
npm install
npm run build
```

## 🔄 Rollback

If something goes wrong, the script creates automatic backups:

```bash
# List available backups
ls -la /srv/http/ada-backups/

# Restore from backup
sudo cp -r /srv/http/ada-backups/ada_backup_[VERSION]_[TIMESTAMP]/* /srv/http/ada/
sudo systemctl reload nginx
```

## 🎉 Success!

When the script completes successfully, you'll see:
- ✅ Version number displayed in the footer
- ✅ Working API calls (same as local development)
- ✅ All your existing functionality preserved
- ✅ Production-optimized assets
- ✅ Automatic service management

Your live site at https://ada.datapulseai.co will work exactly like your local `npm run dev` environment!