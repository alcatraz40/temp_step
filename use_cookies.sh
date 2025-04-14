#!/bin/bash

# Color definitions for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}     Use Cookies for YouTube Authentication         ${NC}"
echo -e "${BLUE}====================================================${NC}"

APP_DIR="/Users/omkarsb/Documents/dance_app"
COOKIES_FILE=""

# Function to prompt for the cookies file
prompt_for_cookies() {
  echo -e "${YELLOW}Enter the path to your cookies.txt file:${NC}"
  read -r COOKIES_FILE
  
  if [ ! -f "$COOKIES_FILE" ]; then
    echo -e "${RED}Error: File not found at $COOKIES_FILE${NC}"
    return 1
  fi
  
  return 0
}

# Check if a cookies file path was provided as an argument
if [ $# -eq 1 ]; then
  COOKIES_FILE="$1"
  if [ ! -f "$COOKIES_FILE" ]; then
    echo -e "${RED}Error: File not found at $COOKIES_FILE${NC}"
    prompt_for_cookies
  fi
else
  prompt_for_cookies
fi

# If we still don't have a valid cookies file, exit
if [ ! -f "$COOKIES_FILE" ]; then
  echo -e "${RED}No valid cookies file provided. Exiting.${NC}"
  exit 1
fi

# Copy the cookies file to the application directory
echo -e "${YELLOW}Copying cookies file to the application...${NC}"
cp "$COOKIES_FILE" "$APP_DIR/cookies.txt"
echo -e "${GREEN}Cookies file copied to $APP_DIR/cookies.txt${NC}"

# Make sure permissions are correct
chmod 600 "$APP_DIR/cookies.txt"

echo -e "${GREEN}Authentication cookies are now configured!${NC}"
echo -e "${YELLOW}You can now start the application with ./start_all.sh${NC}"
echo -e "${BLUE}====================================================${NC}" 