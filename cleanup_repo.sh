#!/bin/bash
set -e

# Make a backup of the repo first
echo "Making a backup of the repository..."
cd "$(dirname "$0")"
REPO_DIR=$(pwd)
BACKUP_DIR="${REPO_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
cp -R "$REPO_DIR" "$BACKUP_DIR"
echo "Backup created at $BACKUP_DIR"

# Cleanup large files from the repository
echo "Cleaning up large files and sensitive files from the repository history..."

# Remove virtual environments and other large files
git filter-repo --path venv/ --invert-paths --force
git filter-repo --path dance_app_env/ --invert-paths --force
git filter-repo --path Untitled.ipynb --invert-paths --force
git filter-repo --path-glob "*.dylib" --invert-paths --force

# Remove sensitive files that might contain secrets/tokens
git filter-repo --path cookies.txt --invert-paths --force
git filter-repo --path backend/cookies.txt --invert-paths --force
git filter-repo --path-glob "**/.env" --invert-paths --force
git filter-repo --path-glob "**/auth_token*" --invert-paths --force

# Prune and clean
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "Repository cleaned successfully. Push with 'git push -f origin main'"
echo "IMPORTANT: All team members will need to clone the repository again after this change."
echo "NOTE: This script removes the 'origin' remote. You'll need to add it back with:"
echo "      git remote add origin git@github.com:alcatraz40/temp_step.git" 