#!/bin/bash

# Script to install dependencies for the dance app
# Especially the beat_this library for ML-based beat detection

echo "Installing dance app dependencies..."

# Activate the Python environment if provided
PYTHON_ENV="/Users/omkarsb/Documents/envs/dance/bin/activate"
if [ -f "$PYTHON_ENV" ]; then
    echo "Activating Python environment: $PYTHON_ENV"
    source "$PYTHON_ENV"
else
    echo "Warning: Python environment not found at $PYTHON_ENV"
    echo "Using current Python environment"
fi

# Install Python dependencies
pip install -r requirements.txt

# Install yt-dlp for video downloading
pip install yt-dlp

# Install additional dependencies for beat_this
pip install torch librosa pytube matplotlib ffmpeg-python

# Install ffmpeg if not already installed
if ! command -v ffmpeg &> /dev/null
then
    echo "ffmpeg not found, installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install ffmpeg
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    else
        echo "Unsupported OS for automatic ffmpeg installation. Please install ffmpeg manually."
    fi
else
    echo "ffmpeg already installed"
fi

# Install beat_this directly from GitHub
echo "Installing beat_this from GitHub..."
pip install https://github.com/CPJKU/beat_this/archive/main.zip

# Verify installation
echo "Verifying installation..."
python -c "from beat_this.inference import File2Beats; print('beat_this library successfully installed!')" || echo "Error: beat_this library installation failed"

# Download the model checkpoint
echo "Downloading model checkpoint..."
python download_model.py

echo "Dependencies installation complete!"
echo "You can now run the dance app with the new beat detection model."
echo "To start the app, run: ./start_all.sh" 