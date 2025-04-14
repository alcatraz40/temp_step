#!/bin/bash
echo "Starting Dance Learning Backend API..."

# Add proper process management
exec uvicorn main:app --host 0.0.0.0 --port 7081