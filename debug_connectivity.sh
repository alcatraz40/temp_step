#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      Network Connectivity Diagnostics${NC}"
echo -e "${BLUE}====================================================${NC}"

# Get external IP addresses
echo -e "${YELLOW}External IP addresses:${NC}"
curl -s ifconfig.me
echo ""
hostname -I

# Check if ports are listening
echo -e "\n${YELLOW}Checking listening ports:${NC}"
netstat -tuln | grep -E ':(3000|7081)'

# Check if backend is reachable
echo -e "\n${YELLOW}Testing backend connectivity:${NC}"
curl -s -o /dev/null -w "%{http_code}" http://localhost:7081/api/health || echo "Failed to connect"

# Check if frontend can reach the backend
echo -e "\n${YELLOW}Testing if frontend can reach backend:${NC}"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "Failed to connect"

# Check firewall settings
echo -e "\n${YELLOW}Firewall status:${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw status
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --list-all
fi

# Check if ports are open externally (requires nmap)
external_ip=$(curl -s ifconfig.me)
echo -e "\n${YELLOW}Testing if ports are open externally:${NC}"
if command -v nc &> /dev/null; then
    echo -e "${GREEN}Checking port 3000:${NC}"
    nc -z -v $external_ip 3000
    echo -e "${GREEN}Checking port 7081:${NC}"
    nc -z -v $external_ip 7081
else
    echo -e "${RED}Install netcat to test externally accessible ports${NC}"
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${BLUE}      Diagnostic Information Complete${NC}"
echo -e "${BLUE}====================================================${NC}"

echo -e "${YELLOW}If accessing from an external device:${NC}"
echo -e "${YELLOW}1. Ensure GCP firewall rules allow traffic to ports 3000 and 7081${NC}"
echo -e "${YELLOW}2. Use http://$external_ip:3000 to access the frontend${NC}"
echo -e "${YELLOW}3. The backend should be accessible at http://$external_ip:7081${NC}" 