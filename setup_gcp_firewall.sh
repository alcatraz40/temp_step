#!/bin/bash

# setup_gcp_firewall.sh - Script to set up required firewall rules for the Dance Application on GCP
# This script requires the Google Cloud SDK (gcloud) to be installed and configured

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud command not found. Please install the Google Cloud SDK.${NC}"
    echo -e "${YELLOW}Visit: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      Setting up GCP Firewall Rules${NC}"
echo -e "${BLUE}====================================================${NC}"

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project is set. Please run 'gcloud config set project YOUR_PROJECT_ID'${NC}"
    exit 1
fi

echo -e "${YELLOW}Current GCP project: ${GREEN}$PROJECT_ID${NC}"

# Function to create a firewall rule if it doesn't exist
create_firewall_rule() {
    local rule_name=$1
    local port=$2
    local description=$3

    echo -e "${YELLOW}Checking for existing firewall rule: $rule_name...${NC}"
    
    # Check if rule exists
    if gcloud compute firewall-rules describe "$rule_name" --project="$PROJECT_ID" &>/dev/null; then
        echo -e "${GREEN}Firewall rule '$rule_name' already exists.${NC}"
    else
        echo -e "${YELLOW}Creating firewall rule for port $port...${NC}"
        
        gcloud compute firewall-rules create "$rule_name" \
            --direction=INGRESS \
            --priority=1000 \
            --network=default \
            --action=ALLOW \
            --rules=tcp:$port \
            --source-ranges=0.0.0.0/0 \
            --description="$description" \
            --project="$PROJECT_ID"
            
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully created firewall rule for port $port.${NC}"
        else
            echo -e "${RED}Failed to create firewall rule for port $port.${NC}"
            echo -e "${YELLOW}Try running manually:${NC}"
            echo -e "${YELLOW}  gcloud compute firewall-rules create $rule_name --allow tcp:$port --source-ranges=0.0.0.0/0 --description=\"$description\"${NC}"
        fi
    fi
}

# Create firewall rules for frontend and backend
create_firewall_rule "allow-dance-app-frontend" "3000" "Allow access to Dance App Frontend"
create_firewall_rule "allow-dance-app-backend" "7081" "Allow access to Dance App Backend API"

# Verify rules were created
echo -e "\n${YELLOW}Verifying firewall rules...${NC}"
echo -e "${YELLOW}List of firewall rules related to the application:${NC}"
gcloud compute firewall-rules list --filter="name=allow-dance-app*" --project="$PROJECT_ID"

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}Firewall setup complete!${NC}"
echo -e "${YELLOW}You should now be able to access:${NC}"
echo -e "${GREEN}  - Frontend: http://YOUR_VM_EXTERNAL_IP:3000${NC}"
echo -e "${GREEN}  - Backend: http://YOUR_VM_EXTERNAL_IP:7081${NC}"
echo -e "${BLUE}====================================================${NC}"

# Additional advice
echo -e "${YELLOW}Note: If you still cannot connect:${NC}"
echo -e "${YELLOW}1. Make sure the application is running${NC}"
echo -e "${YELLOW}2. Check VM instance network tags and ensure they're included in the firewall rules${NC}"
echo -e "${YELLOW}3. Verify there are no conflicting firewall rules with higher priority${NC}"
echo -e "${YELLOW}4. Check if the VM is in a VPC with additional security controls${NC}" 