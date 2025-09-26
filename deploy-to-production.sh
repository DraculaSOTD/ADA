#!/bin/bash

# ADA Platform - Complete Production Deployment Script
# Deploys to ada.datapulseai.co with full backend and frontend setup

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'
UNDERLINE='\033[4m'

# Configuration
SOURCE_DIR="/home/calvin/Websites/ADA"
DEPLOY_DIR="/srv/http/ada"
BACKEND_DIR="/srv/ada-backend"
VERSION_FILE="$SOURCE_DIR/.deployment-version"
BACKUP_DIR="/srv/http/ada-backups"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
SERVICE_NAME="ada-backend"

# Parse command line arguments
SKIP_BUILD=false
CREATE_BACKUP=true
SKIP_BACKEND=false
SKIP_NGINX=false
DRY_RUN=false

show_help() {
    echo "ADA Platform Production Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --skip-build    Skip the build step (use existing build/)"
    echo "  --no-backup     Skip creating backup before deployment"
    echo "  --skip-backend  Skip backend service deployment"
    echo "  --skip-nginx    Skip nginx configuration update"
    echo "  --dry-run       Show what would be done without executing"
    echo "  --help          Show this help message"
    echo ""
    echo "This script will:"
    echo "  1. Build the frontend application"
    echo "  2. Deploy frontend files to /srv/http/ada/"
    echo "  3. Deploy backend service and configuration"
    echo "  4. Update nginx configuration with API proxy"
    echo "  5. Verify all services are running correctly"
    echo ""
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        --skip-backend)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-nginx)
            SKIP_NGINX=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${CYAN}ℹ  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠  $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..60})${NC}"
}

execute_cmd() {
    local cmd="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY RUN] Would execute: $cmd${NC}"
        return 0
    fi
    
    log_info "$description"
    if eval "$cmd"; then
        log_success "$description completed"
    else
        log_error "$description failed"
        return 1
    fi
}

check_prerequisites() {
    log_step "🔍 Checking Prerequisites"
    
    # Check if running as root or with sudo access
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo access for deployment"
        exit 1
    fi
    
    # Check if source directory exists
    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "$SOURCE_DIR/package.json" ]; then
        log_error "package.json not found. Are you in the right directory?"
        exit 1
    fi
    
    # Check for required files
    local required_files=("vite.config.js" "ada.datapulseai.co.nginx" "ada-backend.service")
    for file in "${required_files[@]}"; do
        if [ ! -f "$SOURCE_DIR/$file" ]; then
            log_error "Required file not found: $file"
            exit 1
        fi
    done
    
    log_success "All prerequisites checked"
}

get_version_info() {
    log_step "📊 Version Information"
    
    # Read current version or initialize
    if [ -f "$VERSION_FILE" ]; then
        CURRENT_VERSION=$(cat "$VERSION_FILE")
        log_info "Current Version: $CURRENT_VERSION"
    else
        CURRENT_VERSION="0.0.0"
        log_info "No previous version found"
    fi
    
    # Get git info if available
    if [ -d "$SOURCE_DIR/.git" ]; then
        cd "$SOURCE_DIR"
        GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
        GIT_STATUS=$(git status --porcelain | wc -l)
        
        log_info "Git Branch: $GIT_BRANCH"
        log_info "Git Commit: $GIT_COMMIT"
        if [ "$GIT_STATUS" -gt 0 ]; then
            log_warning "$GIT_STATUS uncommitted changes"
        else
            log_success "Git status clean"
        fi
    fi
    
    # Prompt for new version
    echo ""
    if [ "$DRY_RUN" = false ]; then
        read -p "$(echo -e "${CYAN}Enter the new version number (e.g., 1.0.1): ${NC}")" NEW_VERSION
        
        # Validate version format
        if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            log_error "Invalid version format. Please use X.Y.Z format (e.g., 1.0.1)"
            exit 1
        fi
    else
        NEW_VERSION="dry-run-version"
    fi
    
    DEPLOY_DATE=$(date '+%Y-%m-%d %H:%M:%S')
    DEPLOY_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    
    log_success "Version set to: $NEW_VERSION"
}

create_backup() {
    if [ "$CREATE_BACKUP" = false ]; then
        log_info "Skipping backup creation"
        return 0
    fi
    
    log_step "💾 Creating Backup"
    
    local backup_name="ada_backup_${CURRENT_VERSION}_${DEPLOY_TIMESTAMP}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    execute_cmd "sudo mkdir -p '$BACKUP_DIR'" "Creating backup directory"
    
    if [ -d "$DEPLOY_DIR" ]; then
        execute_cmd "sudo cp -r '$DEPLOY_DIR' '$backup_path'" "Backing up current deployment"
        log_success "Backup created: $backup_path"
    else
        log_info "No existing deployment to backup"
    fi
}

update_version_files() {
    log_step "🔄 Updating Version Information"
    
    # Update AuthPage footer
    local auth_file="$SOURCE_DIR/src/components/AuthPage/AuthPage.html"
    if [ -f "$auth_file" ]; then
        local footer_html="<div class=\"footer-text\">Built by Ava, powered by DataPulse AI<br>Version $NEW_VERSION</div>"
        execute_cmd "sed -i 's|<div class=\"footer-text\">.*</div>|$footer_html|g' '$auth_file'" "Updating AuthPage footer"
    fi
    
    # Update Sidebar footer
    local sidebar_file="$SOURCE_DIR/src/components/Sidebar/Sidebar.html"
    if [ -f "$sidebar_file" ]; then
        local short_info="Built by Ava, powered by DataPulseAI | v$NEW_VERSION"
        execute_cmd "sed -i 's@<p class=\"copyright\">[^<]*</p>@<p class=\"copyright\">$short_info</p>@g' '$sidebar_file'" "Updating Sidebar footer"
    fi
    
    # Create version.json
    local version_json="{
  \"version\": \"$NEW_VERSION\",
  \"deployDate\": \"$DEPLOY_DATE\",
  \"gitCommit\": \"$GIT_COMMIT\",
  \"gitBranch\": \"$GIT_BRANCH\"
}"
    
    if [ "$DRY_RUN" = false ]; then
        echo "$version_json" > "$SOURCE_DIR/version.json"
        log_success "Created version.json"
    else
        log_info "[DRY RUN] Would create version.json with version $NEW_VERSION"
    fi
}

build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_info "Skipping build step"
        return 0
    fi
    
    log_step "🔨 Building Frontend Application"
    
    cd "$SOURCE_DIR"
    
    # Clean previous builds
    execute_cmd "rm -rf '$SOURCE_DIR/build' '$SOURCE_DIR/dist'" "Cleaning previous build files"
    
    # Build the application
    execute_cmd "npm run build" "Building application with Vite"
    
    # Verify build was successful
    if [ ! -d "$SOURCE_DIR/build" ] || [ ! -f "$SOURCE_DIR/build/index.html" ]; then
        log_error "Build failed - no build directory or index.html found"
        exit 1
    fi
    
    log_success "Frontend build completed successfully"
}

deploy_frontend() {
    log_step "🚀 Deploying Frontend Files"
    
    # Create deployment directory
    execute_cmd "sudo mkdir -p '$DEPLOY_DIR'" "Creating deployment directory"
    
    # Deploy built files
    if [ -d "$SOURCE_DIR/build" ] && [ -f "$SOURCE_DIR/build/index.html" ]; then
        log_info "Deploying production build files"
        execute_cmd "sudo cp '$SOURCE_DIR/build/index.html' '$DEPLOY_DIR/'" "Copying index.html"
        execute_cmd "sudo cp -r '$SOURCE_DIR/build/assets' '$DEPLOY_DIR/'" "Copying assets"
    else
        log_warning "No production build found, copying source files"
        execute_cmd "sudo cp '$SOURCE_DIR/index.html' '$DEPLOY_DIR/'" "Copying source index.html"
    fi
    
    # Copy additional required files
    execute_cmd "sudo cp -r '$SOURCE_DIR/src' '$DEPLOY_DIR/'" "Copying src directory"
    execute_cmd "sudo cp '$SOURCE_DIR/version.json' '$DEPLOY_DIR/'" "Copying version.json"
    
    # Copy optional directories if they exist
    for dir in "assets" "pages" "shared"; do
        if [ -d "$SOURCE_DIR/$dir" ]; then
            execute_cmd "sudo cp -r '$SOURCE_DIR/$dir' '$DEPLOY_DIR/'" "Copying $dir directory"
        fi
    done
    
    # Set proper permissions
    execute_cmd "sudo chown -R http:http '$DEPLOY_DIR'" "Setting file ownership"
    execute_cmd "sudo chmod -R 755 '$DEPLOY_DIR'" "Setting file permissions"
    
    log_success "Frontend deployment completed"
}

deploy_backend() {
    if [ "$SKIP_BACKEND" = true ]; then
        log_info "Skipping backend deployment"
        return 0
    fi
    
    log_step "⚙️  Deploying Backend Service"
    
    # Stop existing service if running
    if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
        execute_cmd "sudo systemctl stop $SERVICE_NAME" "Stopping existing backend service"
    fi
    
    # Create backend directory
    execute_cmd "sudo mkdir -p '$BACKEND_DIR'" "Creating backend directory"
    
    # Copy backend files (excluding venv)
    execute_cmd "sudo cp -r '$SOURCE_DIR/backend'/* '$BACKEND_DIR/'" "Copying backend files"
    execute_cmd "sudo rm -rf '$BACKEND_DIR/venv' '$BACKEND_DIR/__pycache__'" "Removing unwanted directories"
    
    # Create virtual environment in production location
    execute_cmd "sudo python3 -m venv '$BACKEND_DIR/venv'" "Creating virtual environment"
    
    # Install dependencies
    execute_cmd "sudo '$BACKEND_DIR/venv/bin/pip' install --upgrade pip" "Upgrading pip"
    execute_cmd "sudo '$BACKEND_DIR/venv/bin/pip' install -r '$BACKEND_DIR/requirements.txt'" "Installing dependencies"
    
    # Set proper ownership for backend files
    execute_cmd "sudo chown -R http:http '$BACKEND_DIR'" "Setting backend file ownership"
    
    # Install systemd service
    execute_cmd "sudo cp '$SOURCE_DIR/ada-backend.service' /etc/systemd/system/" "Installing systemd service"
    
    # Update service file to use correct paths
    execute_cmd "sudo sed -i 's|/home/calvin/Websites/ADA/backend|$BACKEND_DIR|g' /etc/systemd/system/ada-backend.service" "Updating service paths"
    
    # Reload systemd and enable service
    execute_cmd "sudo systemctl daemon-reload" "Reloading systemd configuration"
    execute_cmd "sudo systemctl enable $SERVICE_NAME" "Enabling backend service"
    execute_cmd "sudo systemctl start $SERVICE_NAME" "Starting backend service"
    
    # Wait a moment for service to start
    sleep 3
    
    # Check service status
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Backend service started successfully"
    else
        log_error "Backend service failed to start"
        execute_cmd "sudo systemctl status $SERVICE_NAME" "Checking service status"
        exit 1
    fi
}

deploy_nginx() {
    if [ "$SKIP_NGINX" = true ]; then
        log_info "Skipping nginx configuration"
        return 0
    fi
    
    log_step "🌐 Deploying Nginx Configuration"
    
    # Copy nginx configuration
    execute_cmd "sudo cp '$SOURCE_DIR/ada.datapulseai.co.nginx' '$NGINX_SITES_DIR/ada.datapulseai.co'" "Copying nginx configuration"
    
    # Enable site
    execute_cmd "sudo ln -sf '$NGINX_SITES_DIR/ada.datapulseai.co' '$NGINX_ENABLED_DIR/'" "Enabling nginx site"
    
    # Test nginx configuration
    if ! sudo nginx -t 2>/dev/null; then
        log_error "Nginx configuration test failed"
        execute_cmd "sudo nginx -t" "Testing nginx configuration"
        exit 1
    fi
    
    log_success "Nginx configuration is valid"
    
    # Reload nginx
    execute_cmd "sudo systemctl reload nginx" "Reloading nginx"
    
    log_success "Nginx configuration deployed successfully"
}

verify_deployment() {
    log_step "🧪 Verifying Deployment"
    
    # Wait for services to be fully ready
    sleep 5
    
    # Check backend service
    if systemctl is-active --quiet $SERVICE_NAME; then
        log_success "Backend service is running"
    else
        log_error "Backend service is not running"
        return 1
    fi
    
    # Check nginx service
    if systemctl is-active --quiet nginx; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service is not running"
        return 1
    fi
    
    # Test endpoints
    log_info "Testing endpoints..."
    
    # Test backend health directly
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_warning "Backend health check failed"
    fi
    
    # Test frontend health
    if curl -sf https://ada.datapulseai.co/health > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_warning "Frontend health check failed (may be due to SSL/DNS)"
    fi
    
    # Test API proxy
    if curl -sf https://ada.datapulseai.co/api/health > /dev/null 2>&1; then
        log_success "API proxy health check passed"
    else
        log_warning "API proxy health check failed (may be due to SSL/DNS)"
    fi
    
    # Test version endpoint
    if curl -sf https://ada.datapulseai.co/version.json > /dev/null 2>&1; then
        log_success "Version endpoint accessible"
    else
        log_warning "Version endpoint not accessible"
    fi
    
    log_success "Deployment verification completed"
}

finalize_deployment() {
    log_step "✅ Finalizing Deployment"
    
    # Update version file
    if [ "$DRY_RUN" = false ]; then
        echo "$NEW_VERSION" > "$VERSION_FILE"
        log_success "Version file updated"
    fi
    
    # Show deployment summary
    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║          Deployment Successful! 🎉           ║${NC}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📋 Deployment Summary:${NC}"
    echo -e "  • Version: ${GREEN}v$NEW_VERSION${NC}"
    echo -e "  • Time: ${BLUE}$DEPLOY_DATE${NC}"
    echo -e "  • Frontend: ${BLUE}$DEPLOY_DIR${NC}"
    echo -e "  • Backend: ${BLUE}$BACKEND_DIR${NC}"
    echo ""
    echo -e "${GREEN}🌐 Your site is now LIVE at:${NC}"
    echo -e "   ${BLUE}${UNDERLINE}https://ada.datapulseai.co${NC}"
    echo ""
    echo -e "${CYAN}📱 Available Endpoints:${NC}"
    echo -e "  • Frontend: https://ada.datapulseai.co/"
    echo -e "  • API: https://ada.datapulseai.co/api/"
    echo -e "  • API Docs: https://ada.datapulseai.co/docs"
    echo -e "  • Health: https://ada.datapulseai.co/health"
    echo -e "  • Version: https://ada.datapulseai.co/version.json"
    echo ""
    
    if [ "$GIT_COMMIT" != "unknown" ]; then
        echo -e "${CYAN}🔧 Build Info:${NC}"
        echo -e "  • Git Commit: ${BLUE}$GIT_COMMIT${NC}"
        echo -e "  • Git Branch: ${BLUE}$GIT_BRANCH${NC}"
        echo ""
    fi
    
    echo -e "${YELLOW}💡 Service Management:${NC}"
    echo -e "  • Backend Status: sudo systemctl status $SERVICE_NAME"
    echo -e "  • Backend Logs: sudo journalctl -u $SERVICE_NAME -f"
    echo -e "  • Nginx Logs: sudo tail -f /var/log/nginx/ada.datapulseai-error.log"
    echo ""
}

# Main execution
main() {
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║      ADA Platform Production Deployment      ║${NC}"
    echo -e "${CYAN}${BOLD}║         Target: ada.datapulseai.co           ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}${BOLD}🔍 DRY RUN MODE - No changes will be made${NC}"
        echo ""
    fi
    
    check_prerequisites
    get_version_info
    create_backup
    update_version_files
    build_frontend
    deploy_frontend
    deploy_backend
    deploy_nginx
    verify_deployment
    finalize_deployment
    
    log_success "All deployment steps completed successfully!"
}

# Run main function
main "$@"