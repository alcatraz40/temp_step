#!/bin/bash

echo "Making all shell scripts executable..."

# Make scripts in the main directory executable
chmod +x start_all.sh
chmod +x cleanup.sh
chmod +x backend/restart.sh
chmod +x use_cookies.sh

echo "Done! All scripts are now executable."
echo "You can now run ./cleanup.sh followed by ./start_all.sh to restart the application." 