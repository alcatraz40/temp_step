#!/bin/bash

# Portable setup script for dance_app
# Works on both macOS and Ubuntu

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APP_DIR="$SCRIPT_DIR"
BACKEND_DIR="$APP_DIR/backend"
ENV_DIR="$APP_DIR/venv"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     Setting up Dance Learning Application${NC}"
echo -e "${BLUE}====================================================${NC}"

# Check for required system commands
echo -e "${YELLOW}Checking required system commands...${NC}"
required_commands=("python3" "pip" "npm" "node")
missing_commands=0

for cmd in "${required_commands[@]}"; do
    if ! command_exists "$cmd"; then
        echo -e "${RED}Error: '$cmd' is not installed or not in PATH.${NC}"
        missing_commands=$((missing_commands+1))
    fi
done

# macOS specific checks
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command_exists "brew"; then
        echo -e "${YELLOW}Warning: Homebrew not found. You may need to install dependencies manually.${NC}"
    fi
fi

# Linux specific checks
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! command_exists "apt-get"; then
        echo -e "${YELLOW}Warning: apt-get not found. You may need to install dependencies manually.${NC}"
    fi
fi

if [ $missing_commands -gt 0 ]; then
    echo -e "${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}All required system commands are available.${NC}"

# Create Python virtual environment
echo -e "${YELLOW}Setting up Python virtual environment...${NC}"

# Check Python version (we need Python 3.13+)
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
echo -e "${YELLOW}Detected Python version: $PYTHON_VERSION${NC}"

python3 -m venv "$ENV_DIR"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create virtual environment. Trying with option to upgrade pip...${NC}"
    python3 -m venv "$ENV_DIR" --upgrade-deps
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Please check your Python installation.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}Virtual environment created at: $ENV_DIR${NC}"

# Activate the virtual environment
if [[ "$OSTYPE" == "darwin"* || "$OSTYPE" == "linux-gnu"* ]]; then
    source "$ENV_DIR/bin/activate"
else
    source "$ENV_DIR/Scripts/activate"
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to activate virtual environment.${NC}"
    exit 1
fi

echo -e "${GREEN}Virtual environment activated.${NC}"

# Check if models directory exists
MODELS_DIR="$APP_DIR/models"
mkdir -p "$MODELS_DIR"

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
pip install --upgrade pip wheel setuptools

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
cd "$APP_DIR" || exit 1
pip install -r requirements.txt
pip install -r backend/requirements.txt

# Install ffmpeg if not already installed
if ! command_exists "ffmpeg"; then
    echo -e "${YELLOW}Installing ffmpeg...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    else
        echo -e "${RED}Please install ffmpeg manually.${NC}"
    fi
fi

# Install beat_this from GitHub
echo -e "${YELLOW}Installing beat_this from GitHub...${NC}"
pip install https://github.com/CPJKU/beat_this/archive/main.zip

# Download model checkpoint
echo -e "${YELLOW}Downloading model checkpoint...${NC}"
python download_model.py "$MODELS_DIR"

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd "$APP_DIR" || exit 1
npm install

# Create log directories
mkdir -p "$APP_DIR/logs"

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}To start the application, run: ./portable_start.sh${NC}"

# Make the start script executable
chmod +x "$APP_DIR/portable_start.sh" 2>/dev/null || echo -e "${YELLOW}Note: You may need to manually make portable_start.sh executable${NC}"

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Dance Learning Application setup complete!${NC}"
echo -e "${BLUE}====================================================${NC}" 