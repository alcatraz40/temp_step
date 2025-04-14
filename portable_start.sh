#!/bin/bash

# Portable start script for dance_app
# Works on both macOS and Ubuntu with relative paths

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APP_DIR="$SCRIPT_DIR"
BACKEND_DIR="$APP_DIR/backend"
ENV_DIR="$APP_DIR/venv"
LOGS_DIR="$APP_DIR/logs"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
BACKEND_LOG="$LOGS_DIR/backend.log"

# Create log directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Create log files if they don't exist
touch "$FRONTEND_LOG"
touch "$BACKEND_LOG"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to clean up processes on exit
cleanup() {
    echo -e "${YELLOW}Shutting down services...${NC}"
    
    # Kill all child processes
    pkill -P $$
    
    # Explicitly kill any remaining processes
    if pgrep -f "uvicorn main:app" > /dev/null; then
        echo -e "${YELLOW}Stopping backend server...${NC}"
        pkill -f "uvicorn main:app"
    fi
    
    if pgrep -f "npm run dev" > /dev/null; then
        echo -e "${YELLOW}Stopping frontend server...${NC}"
        pkill -f "npm run dev"
    fi
    
    # Deactivate virtual environment if active
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "${YELLOW}Deactivating virtual environment...${NC}"
        deactivate 2>/dev/null || true
    fi
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Register cleanup function
trap cleanup EXIT INT TERM

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      Starting Dance Learning Application${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check if running on Linux and increase file watch limit if needed
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo -e "${YELLOW}Checking file watcher limits on Linux...${NC}"
    CURRENT_LIMIT=$(cat /proc/sys/fs/inotify/max_user_watches 2>/dev/null || echo "0")
    
    if [ "$CURRENT_LIMIT" -lt "524288" ]; then
        echo -e "${YELLOW}Current file watcher limit is low ($CURRENT_LIMIT). Attempting to increase...${NC}"
        
        if command_exists sudo; then
            # Try to increase the limit
            echo -e "${YELLOW}Running: sudo sysctl -w fs.inotify.max_user_watches=524288${NC}"
            sudo sysctl -w fs.inotify.max_user_watches=524288 >> "$BACKEND_LOG" 2>&1
            
            # Check if successful
            NEW_LIMIT=$(cat /proc/sys/fs/inotify/max_user_watches 2>/dev/null || echo "0")
            if [ "$NEW_LIMIT" -ge "524288" ]; then
                echo -e "${GREEN}Successfully increased file watcher limit to $NEW_LIMIT${NC}"
            else
                echo -e "${YELLOW}Could not increase limit automatically. You may need to run:${NC}"
                echo -e "${YELLOW}  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf${NC}"
                echo -e "${YELLOW}  sudo sysctl -p${NC}"
                echo -e "${YELLOW}Continuing anyway, but you might encounter ENOSPC errors...${NC}"
            fi
        else
            echo -e "${YELLOW}Sudo not available. Please manually increase the file watcher limit:${NC}"
            echo -e "${YELLOW}  echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf${NC}"
            echo -e "${YELLOW}  sudo sysctl -p${NC}"
        fi
    else
        echo -e "${GREEN}File watcher limit is already set to a good value: $CURRENT_LIMIT${NC}"
    fi
    
    # Check firewall status on Linux
    echo -e "${YELLOW}Checking firewall status...${NC}"
    if command_exists ufw; then
        UFW_STATUS=$(sudo ufw status 2>/dev/null)
        if [[ "$UFW_STATUS" == *"active"* ]]; then
            echo -e "${YELLOW}UFW firewall is active. Make sure ports 3000 and 7081 are allowed:${NC}"
            echo -e "${YELLOW}  sudo ufw allow 3000/tcp${NC}"
            echo -e "${YELLOW}  sudo ufw allow 7081/tcp${NC}"
        else
            echo -e "${GREEN}UFW firewall is not active or not detected.${NC}"
        fi
    elif command_exists firewall-cmd; then
        echo -e "${YELLOW}FirewallD detected. Make sure ports 3000 and 7081 are allowed:${NC}"
        echo -e "${YELLOW}  sudo firewall-cmd --permanent --add-port=3000/tcp${NC}"
        echo -e "${YELLOW}  sudo firewall-cmd --permanent --add-port=7081/tcp${NC}"
        echo -e "${YELLOW}  sudo firewall-cmd --reload${NC}"
    else
        echo -e "${YELLOW}No common firewall detected. If you can't access the application externally,${NC}"
        echo -e "${YELLOW}check if any firewall is blocking ports 3000 and 7081.${NC}"
    fi
    
    # For GCP VMs specifically
    if [ -f /etc/os-release ] && grep -q "Google" /etc/os-release; then
        echo -e "${YELLOW}Google Cloud Platform VM detected.${NC}"
        echo -e "${YELLOW}Make sure you've created firewall rules in the GCP Console to allow:${NC}"
        echo -e "${YELLOW}  - TCP port 3000 for frontend${NC}"
        echo -e "${YELLOW}  - TCP port 7081 for backend${NC}"
    fi
fi

# Activate Python virtual environment
echo -e "${YELLOW}Activating Python virtual environment...${NC}"
if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
    source "$ENV_DIR/bin/activate"
else
    source "$ENV_DIR/Scripts/activate"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to activate virtual environment. Run ./portable_setup.sh first.${NC}"
    exit 1
fi
echo -e "${GREEN}Virtual environment activated.${NC}"

# Check if we have Python and Node.js
echo -e "${YELLOW}Checking required commands...${NC}"
required_commands=("python" "pip" "npm" "node")
missing_commands=0

for cmd in "${required_commands[@]}"; do
    if ! command_exists "$cmd"; then
        echo -e "${RED}Error: '$cmd' is not installed or not in PATH.${NC}"
        missing_commands=$((missing_commands+1))
    fi
done

if [ $missing_commands -gt 0 ]; then
    echo -e "${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}All required commands are available.${NC}"

# Check and ensure the backend static directory exists
echo -e "${YELLOW}Checking backend directories...${NC}"
mkdir -p "$BACKEND_DIR/static"
mkdir -p "$BACKEND_DIR/videos"

# Start backend service
echo -e "${YELLOW}Starting backend service...${NC}"
echo "$(date): Starting backend service" >> "$BACKEND_LOG"

# Clean the static directory to ensure no stale files
echo -e "${YELLOW}Cleaning static directory...${NC}"
rm -rf "$BACKEND_DIR/static"/*

# Start uvicorn with proper error handling
cd "$BACKEND_DIR" || { echo -e "${RED}Error: Backend directory not found.${NC}"; exit 1; }
echo -e "${GREEN}Starting backend at $BACKEND_DIR${NC}"

python -m uvicorn main:app --host 0.0.0.0 --port 7081 --reload --log-level debug >> "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# Give backend time to start
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}Backend started successfully with PID $BACKEND_PID${NC}"
    echo -e "${GREEN}Backend logs are being written to: $BACKEND_LOG${NC}"
else
    echo -e "${RED}Error: Backend failed to start. Check logs at $BACKEND_LOG${NC}"
    # Continue anyway to start frontend
fi

# Start frontend service
echo -e "${YELLOW}Starting frontend service...${NC}"
cd "$APP_DIR" || { echo -e "${RED}Error: Application directory not found.${NC}"; exit 1; }
echo "$(date): Starting frontend service" >> "$FRONTEND_LOG"

# Start frontend with proper error handling
echo -e "${GREEN}Starting frontend at $APP_DIR${NC}"
npm run dev >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# Give frontend time to start
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 5

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    # Get internal IP
    INTERNAL_IP=$(hostname -I | awk '{print $1}')
    echo -e "${GREEN}Frontend started successfully with PID $FRONTEND_PID${NC}"
    echo -e "${GREEN}Frontend is available at:${NC}"
    echo -e "${GREEN}  - Local: http://localhost:3000${NC}"
    echo -e "${GREEN}  - Internal network: http://$INTERNAL_IP:3000${NC}"
    
    # Try to get external IP for better instructions
    if command_exists curl; then
        EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
        if [ "$EXTERNAL_IP" != "unknown" ]; then
            echo -e "${GREEN}  - External (may need firewall rules): http://$EXTERNAL_IP:3000${NC}"
        fi
    fi
    
    echo -e "${GREEN}Frontend logs are being written to: $FRONTEND_LOG${NC}"
    
    # Check if we can access the frontend locally
    if command_exists curl; then
        echo -e "${YELLOW}Testing local frontend connection...${NC}"
        if curl -s --head --fail http://localhost:3000 >/dev/null; then
            echo -e "${GREEN}✓ Frontend is responding locally${NC}"
        else
            echo -e "${RED}✗ Cannot connect to frontend locally. Check logs for errors.${NC}"
        fi
    fi
    
    # Network connectivity help
    echo -e "${YELLOW}If you cannot access the application from external machines:${NC}"
    echo -e "${YELLOW}1. Check that ports 3000 and 7081 are open in your firewall${NC}"
    echo -e "${YELLOW}2. If using a cloud provider (AWS, GCP, Azure), check security groups/firewall rules${NC}"
    echo -e "${YELLOW}3. For GCP VMs, create firewall rules for ports 3000 and 7081 in the GCP Console${NC}"
else
    echo -e "${RED}Error: Frontend failed to start. Check logs at $FRONTEND_LOG${NC}"
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Dance Learning Application is now running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo -e "${BLUE}====================================================${NC}"

# Keep the script running to maintain process group
wait 