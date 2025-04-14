#!/bin/bash

# Color definitions for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     Dance Learning Application Cleanup Script      ${NC}"
echo -e "${BLUE}====================================================${NC}"

APP_DIR="/Users/omkarsb/Documents/dance_app"
BACKEND_DIR="$APP_DIR/backend"

# Stop running processes
echo -e "${YELLOW}Stopping any running processes...${NC}"

# Stop backend
if pgrep -f "uvicorn main:app" > /dev/null; then
    echo "Stopping backend server..."
    pkill -f "uvicorn main:app"
    sleep 2
    # Force kill if needed
    if pgrep -f "uvicorn main:app" > /dev/null; then
        echo "Force stopping backend server..."
        pkill -9 -f "uvicorn main:app"
    fi
fi

# Stop frontend
if pgrep -f "npm run dev" > /dev/null; then
    echo "Stopping frontend server..."
    pkill -f "npm run dev"
    sleep 2
    # Force kill if needed
    if pgrep -f "npm run dev" > /dev/null; then
        echo "Force stopping frontend server..."
        pkill -9 -f "npm run dev"
    fi
fi

# Clear backend static directory
echo -e "${YELLOW}Cleaning backend static directory...${NC}"
if [ -d "$BACKEND_DIR/static" ]; then
    rm -rf "$BACKEND_DIR/static"/*
    echo -e "${GREEN}Static directory cleaned.${NC}"
else
    mkdir -p "$BACKEND_DIR/static"
    echo -e "${GREEN}Static directory created.${NC}"
fi

# Clean temporary files
echo -e "${YELLOW}Cleaning temporary files...${NC}"
# Find and delete temporary directories older than 1 hour
if command -v find >/dev/null 2>&1; then
    find /tmp -name "tmp*" -type d -cmin +60 2>/dev/null | xargs rm -rf 2>/dev/null
    echo -e "${GREEN}Temporary files cleaned.${NC}"
else
    echo -e "${YELLOW}Find command not available, skipping temporary file cleanup${NC}"
fi

# Clear log files
echo -e "${YELLOW}Clearing log files...${NC}"
echo "" > "$APP_DIR/frontend.log"
echo "" > "$APP_DIR/backend.log"
echo -e "${GREEN}Log files cleared.${NC}"

# Clean Python cache files
echo -e "${YELLOW}Cleaning Python cache files...${NC}"
find "$BACKEND_DIR" -name "__pycache__" -type d -exec rm -rf {} +  2>/dev/null || true
find "$BACKEND_DIR" -name "*.pyc" -delete 2>/dev/null || true
echo -e "${GREEN}Python cache files cleaned.${NC}"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Cleanup complete! You can now restart the application.${NC}"
echo -e "${YELLOW}Run ./start_all.sh to start all services.${NC}"
echo -e "${BLUE}====================================================${NC}" 