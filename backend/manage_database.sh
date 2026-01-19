#!/bin/bash

# ADA Database Management Script
# Provides easy commands for managing the multi-tenant database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Virtual environment not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

# Activate virtual environment
echo -e "${BLUE}🐍 Activating virtual environment...${NC}"
source venv/bin/activate

# Set environment variables
export USE_SQLITE=true
export SQLITE_DB_PATH=./ada.db

show_help() {
    echo -e "${BLUE}ADA Database Management Tool${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup       - Initialize database with all tables and default data"
    echo "  verify      - Verify database setup and show table counts" 
    echo "  reset       - Reset database (WARNING: This will delete all data!)"
    echo "  backup      - Create a backup of the current database"
    echo "  restore     - Restore database from backup"
    echo "  status      - Show database status and basic info"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Initialize fresh database"
    echo "  $0 verify    # Check database health"
    echo "  $0 backup    # Create backup before changes"
}

backup_database() {
    if [ -f "ada.db" ]; then
        timestamp=$(date +"%Y%m%d_%H%M%S")
        backup_file="ada.db.backup_${timestamp}"
        cp ada.db "$backup_file"
        echo -e "${GREEN}✅ Database backed up to: $backup_file${NC}"
    else
        echo -e "${YELLOW}⚠️  No database file found to backup${NC}"
    fi
}

restore_database() {
    echo "Available backups:"
    ls -la ada.db.backup_* 2>/dev/null || {
        echo -e "${RED}❌ No backup files found${NC}"
        exit 1
    }
    
    echo ""
    echo "Enter the backup filename to restore:"
    read -r backup_file
    
    if [ -f "$backup_file" ]; then
        echo -e "${YELLOW}⚠️  This will replace the current database. Continue? (y/N)${NC}"
        read -r confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            cp "$backup_file" ada.db
            echo -e "${GREEN}✅ Database restored from: $backup_file${NC}"
        else
            echo -e "${BLUE}ℹ️  Restore cancelled${NC}"
        fi
    else
        echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        exit 1
    fi
}

show_status() {
    echo -e "${BLUE}📊 Database Status${NC}"
    echo ""
    
    if [ -f "ada.db" ]; then
        db_size=$(ls -lh ada.db | awk '{print $5}')
        db_modified=$(ls -l ada.db | awk '{print $6, $7, $8}')
        echo -e "Database file: ${GREEN}ada.db${NC}"
        echo -e "Size: ${GREEN}$db_size${NC}"
        echo -e "Modified: ${GREEN}$db_modified${NC}"
        echo ""
        echo "Running verification..."
        python setup_database.py verify
    else
        echo -e "${RED}❌ No database found${NC}"
        echo "Run '$0 setup' to initialize the database"
    fi
}

# Main script logic
case "${1:-help}" in
    setup)
        echo -e "${GREEN}🚀 Setting up ADA database...${NC}"
        python setup_database.py setup
        ;;
    verify)
        echo -e "${BLUE}🔍 Verifying database...${NC}"
        python setup_database.py verify
        ;;
    reset)
        echo -e "${YELLOW}⚠️  This will delete ALL data in the database!${NC}"
        echo "Type 'CONFIRM_RESET' to proceed:"
        read -r confirm
        if [ "$confirm" = "CONFIRM_RESET" ]; then
            python setup_database.py reset
        else
            echo -e "${BLUE}ℹ️  Reset cancelled${NC}"
        fi
        ;;
    backup)
        echo -e "${BLUE}💾 Creating database backup...${NC}"
        backup_database
        ;;
    restore)
        echo -e "${BLUE}🔄 Restoring database...${NC}"
        restore_database
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac