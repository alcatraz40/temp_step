#!/bin/bash

# Color definitions for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment and directory settings
PYTHON_ENV="/Users/omkarsb/Documents/envs/dance/bin/activate"
APP_DIR="/Users/omkarsb/Documents/dance_app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_LOG="$APP_DIR/frontend.log"
BACKEND_LOG="$APP_DIR/backend.log"

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
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Register cleanup function
trap cleanup EXIT INT TERM

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      Starting Dance Learning Application${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check and activate Python environment
echo -e "${YELLOW}Activating Python environment...${NC}"
if [ -f "$PYTHON_ENV" ]; then
    source "$PYTHON_ENV"
    echo -e "${GREEN}Python environment activated successfully.${NC}"
else
    echo -e "${RED}Error: Python environment not found at $PYTHON_ENV${NC}"
    echo -e "${YELLOW}Continuing with system Python...${NC}"
fi

# Move to app directory
cd "$APP_DIR" || { echo -e "${RED}Error: Application directory not found.${NC}"; exit 1; }
echo -e "${GREEN}Working directory: $(pwd)${NC}"

# Check for required commands
echo -e "${YELLOW}Checking required commands...${NC}"
required_commands=("python" "npm" "node")
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

# Check Python packages in the backend
echo -e "${YELLOW}Checking backend dependencies...${NC}"
cd "$BACKEND_DIR" || { echo -e "${RED}Error: Backend directory not found.${NC}"; exit 1; }

echo "Installing backend dependencies..."
pip install -r requirements.txt

# Start backend service
echo -e "${YELLOW}Starting backend service...${NC}"
echo "$(date): Starting backend service" >> "$BACKEND_LOG"

# Clear the static directory to remove old files
echo "Cleaning static directory..."
if [ -d "$BACKEND_DIR/static" ]; then
    rm -rf "$BACKEND_DIR/static"/*
fi
mkdir -p "$BACKEND_DIR/static"

# Start uvicorn with proper error handling
cd "$BACKEND_DIR" || { echo -e "${RED}Error: Backend directory not found.${NC}"; exit 1; }
uvicorn main:app --host 0.0.0.0 --port 7081 --reload >> "$BACKEND_LOG" 2>&1 &
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

# Ensure npm dependencies are installed
echo "Installing frontend dependencies..."
npm install >> "$FRONTEND_LOG" 2>&1

# Start frontend with proper error handling
npm run dev >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# Give frontend time to start
echo -e "${YELLOW}Waiting for frontend to initialize...${NC}"
sleep 5

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}Frontend started successfully with PID $FRONTEND_PID${NC}"
    echo -e "${GREEN}Frontend is available at http://localhost:3000${NC}"
    echo -e "${GREEN}Frontend logs are being written to: $FRONTEND_LOG${NC}"
else
    echo -e "${RED}Error: Frontend failed to start. Check logs at $FRONTEND_LOG${NC}"
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Dance Learning Application is now running!${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo -e "${BLUE}====================================================${NC}"

# Keep the script running to maintain process group
wait 