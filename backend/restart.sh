#!/bin/bash

echo "Stopping any running backend processes..."
pkill -f "uvicorn main:app" || true

echo "Cleaning the static directory..."
rm -rf static/*

echo "Installing updated requirements..."
pip install -r requirements.txt

# Make sure the pytube is working properly
echo "Fixing pytube if needed..."
pip install pytube --upgrade

echo "Starting the backend with uvicorn..."
uvicorn main:app --host 0.0.0.0 --port 7081 --reload > ../backend.log 2>&1 &

echo "Backend restarted. Check backend.log for details."
echo "You can run: tail -f ../backend.log to see live logs" 