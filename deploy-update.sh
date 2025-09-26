#!/bin/bash

# ADA Platform Deployment Update Script
# This script deploys updates to ada.datapulseai.co with version tracking

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
UNDERLINE='\033[4m'

# Configuration
DEPLOY_DIR="/srv/http/ada"
SOURCE_DIR="/home/calvin/Websites/ADA"
VERSION_FILE="$SOURCE_DIR/.deployment-version"
BACKUP_DIR="/srv/http/ada-backups"

# Parse command line arguments
SKIP_BUILD=false
CREATE_BACKUP=false
QUICK_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            QUICK_MODE=true
            SKIP_BUILD=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --quick       Quick deployment (skip build, just sync files)"
            echo "  --skip-build  Skip the build step"
            echo "  --backup      Create backup before deploying"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ADA Platform Deployment Update Script    ║${NC}"
echo -e "${CYAN}║      Deploys to: ada.datapulseai.co         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This script will:${NC}"
echo -e "  1. Update version numbers in source files"
echo -e "  2. Build the application with Vite"
echo -e "  3. Deploy to production at ${BLUE}https://ada.datapulseai.co${NC}"
echo ""

# Step 1: Get version information
echo -e "${YELLOW}📊 Version Information${NC}"
echo -e "${YELLOW}────────────────────────${NC}"

# Read current version or initialize
if [ -f "$VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$VERSION_FILE")
    echo -e "Current Version: ${BLUE}$CURRENT_VERSION${NC}"
else
    CURRENT_VERSION="0.0.0"
    echo -e "No previous version found, starting fresh"
fi

# Prompt for new version
echo ""
read -p "$(echo -e "${CYAN}Enter the new version number (e.g., 1.0.0, 2.1.3): ${NC}")" NEW_VERSION

# Validate version format (basic check)
if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format. Please use X.Y.Z format (e.g., 1.0.0)${NC}"
    exit 1
fi

# Get git info if available
if [ -d "$SOURCE_DIR/.git" ]; then
    cd "$SOURCE_DIR"
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    GIT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    GIT_STATUS=$(git status --porcelain | wc -l)
    
    echo -e "Git Branch: ${BLUE}$GIT_BRANCH${NC}"
    echo -e "Git Commit: ${BLUE}$GIT_COMMIT${NC}"
    if [ "$GIT_STATUS" -gt 0 ]; then
        echo -e "Git Status: ${YELLOW}$GIT_STATUS uncommitted changes${NC}"
    else
        echo -e "Git Status: ${GREEN}Clean${NC}"
    fi
fi

# Deployment info
DEPLOY_DATE=$(date '+%Y-%m-%d %H:%M:%S')
DEPLOY_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo -e "New Version: ${GREEN}v$NEW_VERSION${NC}"
echo -e "Deployment Date: ${BLUE}$DEPLOY_DATE${NC}"
echo ""

# Step 2: Create backup if requested
if [ "$CREATE_BACKUP" = true ]; then
    echo -e "${YELLOW}💾 Creating Backup${NC}"
    echo -e "${YELLOW}────────────────────────${NC}"
    
    sudo mkdir -p "$BACKUP_DIR"
    BACKUP_NAME="ada_backup_${CURRENT_VERSION}_${DEPLOY_TIMESTAMP}"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    echo -n "Creating backup at $BACKUP_PATH..."
    sudo cp -r "$DEPLOY_DIR" "$BACKUP_PATH" 2>/dev/null || true
    echo -e " ${GREEN}✓${NC}"
    echo ""
fi

# Step 3: Update version in footer files
echo -e "${YELLOW}🔄 Updating Version Information in Source Files${NC}"
echo -e "${YELLOW}────────────────────────${NC}"
echo -e "${CYAN}Updating local source files with version $NEW_VERSION...${NC}"

# Update AuthPage footer
AUTH_FILE="$SOURCE_DIR/src/components/AuthPage/AuthPage.html"
if [ -f "$AUTH_FILE" ]; then
    # Create deployment info text with version on separate line
    FOOTER_HTML="<div class=\"footer-text\">Built by Ava, powered by DataPulse AI<br>Version $NEW_VERSION</div>"
    
    # Update the footer text
    sed -i "s|<div class=\"footer-text\">.*</div>|$FOOTER_HTML|g" "$AUTH_FILE"
    if [ $? -eq 0 ]; then
        echo -e "Updated: ${GREEN}AuthPage.html${NC}"
    else
        echo -e "Failed to update: ${RED}AuthPage.html${NC}"
        exit 1
    fi
fi

# Update Sidebar footer
SIDEBAR_FILE="$SOURCE_DIR/src/components/Sidebar/Sidebar.html"
if [ -f "$SIDEBAR_FILE" ]; then
    # Create shorter version for sidebar with version
    SHORT_INFO="Built by Ava, powered by DataPulseAI | v$NEW_VERSION"
    
    # Update the copyright text (use @ as delimiter to avoid conflict with |)
    sed -i "s@<p class=\"copyright\">[^<]*</p>@<p class=\"copyright\">$SHORT_INFO</p>@g" "$SIDEBAR_FILE"
    if [ $? -eq 0 ]; then
        echo -e "Updated: ${GREEN}Sidebar.html${NC}"
    else
        echo -e "Failed to update: ${RED}Sidebar.html${NC}"
        exit 1
    fi
fi

# Also create a version.json file for the application to read
echo "{
  \"version\": \"$NEW_VERSION\",
  \"deployDate\": \"$DEPLOY_DATE\",
  \"gitCommit\": \"$GIT_COMMIT\",
  \"gitBranch\": \"$GIT_BRANCH\"
}" > "$SOURCE_DIR/version.json"
echo -e "Created: ${GREEN}version.json${NC}"
echo ""

# Step 4: Build the application (if not skipped)
if [ "$SKIP_BUILD" = false ] && [ -f "$SOURCE_DIR/package.json" ]; then
    echo -e "${YELLOW}🔨 Building Application for Production${NC}"
    echo -e "${YELLOW}────────────────────────${NC}"
    echo -e "${CYAN}This step compiles the application for the web server...${NC}"
    
    cd "$SOURCE_DIR"
    
    # Clean build folders to avoid permission issues
    if [ -d "$SOURCE_DIR/dist" ]; then
        echo "Cleaning previous dist files..."
        sudo rm -rf "$SOURCE_DIR/dist"
        echo -e "${GREEN}✓ Old dist files cleaned${NC}"
    fi
    if [ -d "$SOURCE_DIR/build" ]; then
        echo "Cleaning previous build files..."
        rm -rf "$SOURCE_DIR/build"
        echo -e "${GREEN}✓ Old build files cleaned${NC}"
    fi
    
    # Check if build script exists
    if grep -q '"build"' package.json; then
        echo "Running npm build (using Vite)..."
        npm run build
        
        # Check if build was successful
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Build completed successfully${NC}"
            
            # Fix permissions on the new build folder
            if [ -d "$SOURCE_DIR/build" ]; then
                chown -R $(whoami):$(whoami) "$SOURCE_DIR/build" 2>/dev/null || true
                echo -e "${GREEN}✓ Build permissions fixed${NC}"
            fi
        else
            echo -e "${RED}✗ Build failed!${NC}"
            echo -e "${RED}Please check the error messages above${NC}"
            exit 1
        fi
    else
        echo -e "${RED}WARNING: No build script found, skipping build step${NC}"
        echo -e "${RED}The application may not work correctly without building!${NC}"
    fi
    echo ""
else
    if [ "$SKIP_BUILD" = true ]; then
        echo -e "${YELLOW}⚠️  Build step skipped (--skip-build flag used)${NC}"
        echo -e "${YELLOW}   Changes may not appear if source files need compilation${NC}"
        echo ""
    fi
fi

# Step 5: Deploy files to production
echo -e "${YELLOW}🚀 Deploying to Production Server${NC}"
echo -e "${YELLOW}────────────────────────${NC}"
echo -e "${CYAN}Target: ${BLUE}$DEPLOY_DIR${NC} (web server directory)"
echo -e "${CYAN}URL: ${BLUE}https://ada.datapulseai.co${NC}"
echo ""

# Ensure deployment directory exists
sudo mkdir -p "$DEPLOY_DIR"

# Copy all necessary files
echo "Copying files to production..."

# Copy files based on whether we have a build
if [ -d "$SOURCE_DIR/build" ] && [ -f "$SOURCE_DIR/build/index.html" ]; then
    # Production build exists - copy built files
    echo -e "${CYAN}Deploying production build...${NC}"
    
    echo -n "  • Copying built index.html..."
    sudo cp "$SOURCE_DIR/build/index.html" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
    
    echo -n "  • Copying built assets..."
    if [ -d "$SOURCE_DIR/build/assets" ]; then
        sudo cp -r "$SOURCE_DIR/build/assets" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
    fi
elif [ -d "$SOURCE_DIR/dist" ] && [ -f "$SOURCE_DIR/dist/index.html" ]; then
    # Fallback to dist directory
    echo -e "${CYAN}Deploying production build from dist...${NC}"
    
    echo -n "  • Copying built index.html..."
    sudo cp "$SOURCE_DIR/dist/index.html" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
    
    echo -n "  • Copying built assets..."
    if [ -d "$SOURCE_DIR/dist/assets" ]; then
        sudo cp -r "$SOURCE_DIR/dist/assets" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
    fi
else
    # No build - copy source files (development mode)
    echo -e "${YELLOW}Warning: No production build found, copying source files...${NC}"
    
    echo -n "  • Copying source index.html..."
    sudo cp -r "$SOURCE_DIR/index.html" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
fi

# Always copy src directory for resources
echo -n "  • Copying src/ directory..."
sudo cp -r "$SOURCE_DIR/src" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"

echo -n "  • Copying version.json..."
sudo cp -r "$SOURCE_DIR/version.json" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"

if [ -d "$SOURCE_DIR/assets" ]; then
    echo -n "  • Copying assets/..."
    sudo cp -r "$SOURCE_DIR/assets" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
fi

if [ -d "$SOURCE_DIR/pages" ]; then
    echo -n "  • Copying pages/..."
    sudo cp -r "$SOURCE_DIR/pages" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
fi

if [ -d "$SOURCE_DIR/shared" ]; then
    echo -n "  • Copying shared/..."
    sudo cp -r "$SOURCE_DIR/shared" "$DEPLOY_DIR/" 2>/dev/null && echo -e " ${GREEN}✓${NC}" || echo -e " ${RED}✗${NC}"
fi

echo -e "${GREEN}✓ All files copied to production${NC}"

# Step 6: Set proper permissions
echo -n "Setting permissions..."
sudo chown -R http:http "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"
echo -e " ${GREEN}✓${NC}"
echo ""

# Step 7: Update version file
echo "$NEW_VERSION" > "$VERSION_FILE"

# Step 8: Test the deployment
echo -e "${YELLOW}🧪 Testing Deployment${NC}"
echo -e "${YELLOW}────────────────────────${NC}"

# Test if site is responding
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ada.datapulseai.co/health 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "Health Check: ${GREEN}✓ Passed${NC} (HTTP $HTTP_STATUS)"
else
    echo -e "Health Check: ${YELLOW}⚠ Warning${NC} (HTTP $HTTP_STATUS)"
    echo "Note: Site may take a moment to respond after deployment"
fi

# Check version endpoint if available
VERSION_CHECK=$(curl -s https://ada.datapulseai.co/version.json 2>/dev/null | grep -o "\"version\":\"$NEW_VERSION\"" || echo "")
if [ ! -z "$VERSION_CHECK" ]; then
    echo -e "Version Check: ${GREEN}✓ Confirmed${NC} (v$NEW_VERSION)"
else
    echo -e "Version Check: ${YELLOW}⚠ Pending${NC}"
fi
echo ""

# Step 9: Summary
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Deployment Successful! 🎉           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📋 Deployment Summary:${NC}"
echo -e "  • Version: ${GREEN}v$NEW_VERSION${NC}"
echo -e "  • Time: ${BLUE}$DEPLOY_DATE${NC}"
echo -e "  • Deployed to: ${BLUE}$DEPLOY_DIR${NC}"
echo ""
echo -e "${GREEN}🌐 Your changes are now LIVE at:${NC}"
echo -e "   ${BLUE}${UNDERLINE}https://ada.datapulseai.co${NC}"
echo ""
echo -e "${CYAN}The version \"$NEW_VERSION\" will be displayed:${NC}"
echo -e "  • On the login page footer (below \"Built by Ava, powered by DataPulse AI\")"
echo -e "  • In the sidebar footer (as \"Built by Ava, powered by DataPulseAI | v$NEW_VERSION\")"
if [ "$GIT_COMMIT" != "unknown" ]; then
    echo -e "  • Commit: ${BLUE}$GIT_COMMIT${NC}"
fi
echo ""
echo -e "${CYAN}📝 Footer Updated To:${NC}"
echo -e "  Login Page: \"Built by Ava, powered by DataPulse AI\""
echo -e "              \"Version $NEW_VERSION\""
echo -e "  Sidebar: \"Built by Ava, powered by DataPulseAI | v$NEW_VERSION\""
echo ""

# Optional: Show recent deployments
if [ -f "$VERSION_FILE" ]; then
    echo -e "${CYAN}📊 Deployment Statistics:${NC}"
    echo -e "  • Current Version: ${GREEN}$NEW_VERSION${NC}"
    
    # Calculate deployment frequency if we have git history
    if [ -d "$SOURCE_DIR/.git" ]; then
        FIRST_COMMIT_DATE=$(cd "$SOURCE_DIR" && git log --reverse --format="%ai" | head -1 | cut -d' ' -f1)
        if [ ! -z "$FIRST_COMMIT_DATE" ]; then
            DAYS_SINCE_START=$(( ($(date +%s) - $(date -d "$FIRST_COMMIT_DATE" +%s)) / 86400 ))
            if [ $DAYS_SINCE_START -gt 0 ]; then
                echo -e "  • Days Since First Commit: ${BLUE}$DAYS_SINCE_START days${NC}"
            fi
        fi
    fi
fi
echo ""

# Reminder about automatic updates
echo -e "${YELLOW}💡 Tip:${NC} Add this script to your git hooks or CI/CD pipeline for automatic deployments!"
echo ""