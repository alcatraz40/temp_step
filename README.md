# Dance App with ML-Based Beat Detection

A web application for analyzing YouTube videos, detecting musical beats, and helping with dance practice.

## Features

- Download audio from YouTube videos
- Separate audio into harmonic (vocals/melody) and percussive (drums/rhythm) components
- Detect beats using a machine learning approach
- Generate audio tracks with audible clicks at the beat positions
- Visualize the waveform with beat markers
- Create step-by-step dance guides based on detected beats

## New Feature: ML-Based Beat Detection

This version includes a state-of-the-art beat detection system using the `beat_this` library, which uses a machine learning model to detect both beats and downbeats in music. This provides higher accuracy than traditional signal processing approaches.

### Benefits

- Higher accuracy in beat detection across various music genres
- Detection of both regular beats and downbeats (main beats)
- Better performance with complex rhythms and varying tempos
- More natural-sounding click tracks that follow musical structure

## Installation

Before running the app, you need to install the required dependencies, including the ML-based beat detection model:

```bash
# Make the install script executable if it's not already
chmod +x install_dependencies.sh

# Run the installation script
./install_dependencies.sh
```

This will install:
- PyTorch and related packages
- The beat_this library and its prerequisites

## Running the App

To start the application:

```bash
# Start both frontend and backend
./start_all.sh
```

Then open your browser and navigate to `http://localhost:5173` to use the application.

## System Requirements

- Python 3.9+
- Sufficient disk space for audio processing (at least 1GB recommended)
- Modern web browser (Chrome, Firefox, Safari)
- Internet connection for YouTube video downloads

## Technology Stack

- Backend: FastAPI, Librosa, beat_this (ML-based beat detection)
- Frontend: React, Vite, TypeScript
- Audio processing: Librosa, audio-separator, beat_this
- Data visualization: Matplotlib

## Architecture

- **Frontend**: React with TypeScript, YouTube API integration
- **Backend**: FastAPI with Python for beat detection and analysis
- **Audio Processing**: Uses librosa, Spleeter, and yt-dlp for advanced audio analysis

## Quick Start

The easiest way to run the application is using the all-in-one launcher script:

```bash
# Navigate to the project directory
cd /Users/omkarsb/Documents/dance_app

# Make the launcher script executable
chmod +x start_all.sh

# Run the launcher (starts both frontend and backend)
./start_all.sh
```

This will:
1. Activate the Python environment
2. Install all necessary dependencies
3. Start the backend server (on port 7081)
4. Start the frontend development server (on port 5173)
5. Provide URLs to access the application

Then open your browser and go to http://localhost:5173

## Manual Setup

### Backend Setup

```bash
# Navigate to backend directory
cd /Users/omkarsb/Documents/dance_app/backend

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
./start.sh
```

### Frontend Setup

```bash
# Navigate to project root
cd /Users/omkarsb/Documents/dance_app

# Install dependencies
npm install

# Start development server
npm run dev
```

## How to Use

1. Open the application in your browser
2. Click "Load YouTube Video" and enter a valid YouTube URL
3. Wait for the analysis to complete
4. Use the timeline to navigate between steps
5. Toggle loop mode to practice steps repeatedly
6. Listen to the audio with click markers to understand the beat

## Debugging

If you encounter issues:
- Check backend logs at `backend/backend.log`
- Check frontend logs at `frontend.log`
- Examine the terminal output for specific error messages
- Try the debug audio player to hear detected beats

## Troubleshooting

### Process Management Issues

If you encounter any issues with zombie processes or the application not starting properly, you can use the cleanup script:

```bash
# Make the cleanup script executable
chmod +x cleanup.sh

# Run the cleanup script
./cleanup.sh
```

This will kill any lingering processes related to the application, including:
- Backend uvicorn processes
- Frontend vite processes
- YouTube download processes (yt-dlp)

After running the cleanup script, you can try starting the application again with `./start_all.sh`.

### Known Issues

1. **YouTube Playlist URLs:** The application only supports single video URLs, not playlists. If you enter a playlist URL, the application will now show an error message instead of attempting to download the entire playlist.

2. **Process Termination:** If you kill the terminal running `start_all.sh` instead of using Ctrl+C, some child processes might continue running in the background. Use `./cleanup.sh` to ensure all processes are properly terminated.

## Requirements

### Backend
- Python 3.8+
- FastAPI, librosa, Spleeter, yt-dlp
- FFmpeg (for audio processing)

### Frontend
- Node.js 14+
- React 18
- TypeScript
- styled-components

## Acknowledgements

- YouTube API for video playback
- Librosa for audio analysis
- Spleeter for vocal separation
- FastAPI for backend API

## Bypassing YouTube Anti-Bot Verification

YouTube sometimes requires human verification when accessing videos through automated tools. There are several ways to handle this:

### Method 1: Use Browser Cookies (Recommended)

1. Install a browser extension to export cookies:
   - Chrome: [Get cookies.txt](https://chrome.google.com/webstore/detail/get-cookiestxt/bgaddhkoddajcdgocldbbfleckgcbcid)
   - Firefox: [Cookie Quick Manager](https://addons.mozilla.org/en-US/firefox/addon/cookie-quick-manager/)

2. Visit YouTube in your browser and sign in to your Google account.

3. Export your cookies to a file (format should be Netscape/Mozilla cookies.txt format).

4. Use the provided script to configure cookies:
   ```bash
   chmod +x use_cookies.sh
   ./use_cookies.sh /path/to/your/cookies.txt
   ```

5. Start the application normally:
   ```bash
   ./start_all.sh
   ```

### Method 2: Try Different Videos

Some videos are less likely to trigger YouTube's verification system:

- Use well-known, popular videos
- Avoid age-restricted or limited content
- Use shorter videos (under 5 minutes)

### Method 3: Use Fallback Mode

The application automatically falls back to a simplified mode when YouTube verification is triggered. This provides:

- Basic step generation
- Video playback still works
- Simple waveform visualization

Note: In fallback mode, beat detection is not performed, and steps are evenly spaced.

## Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dance_app
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   By default, the API URL is set to `http://localhost:7081` for local development.

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the backend server**
   ```bash
   ./start_all.sh
   ```

5. **Start the frontend development server**
   ```bash
   npm run dev
   ```

## Deployment to Vercel

### Frontend Deployment

1. **Push your code to GitHub**

2. **Sign up for a Vercel account**
   - Go to [Vercel](https://vercel.com/) and sign up or log in

3. **Import your GitHub repository**
   - Click "Add New" → "Project"
   - Select your repository
   - Configure the project:
     - Framework preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`

4. **Set Environment Variables**
   - In Vercel's project settings, go to "Environment Variables"
   - Add the following variable:
     - Name: `VITE_API_URL`
     - Value: `https://your-backend-url.com` (URL where your backend is deployed)

5. **Deploy**
   - Click "Deploy"

### Backend Deployment

The backend should be deployed separately to a suitable service that can run Python applications:

1. **Options for Backend Deployment:**
   - Heroku
   - AWS EC2
   - Google Cloud Run
   - Digital Ocean Droplet
   - Render.com

2. **Key Considerations:**
   - The backend needs to be accessible via HTTPS
   - Ensure that CORS is configured to allow requests from your Vercel frontend domain
   - Set environment variables on your backend hosting to match your setup

## Vercel Deployment Limitations

When deploying to Vercel, be aware of these limitations:

1. **Serverless Functions**: Vercel's serverless functions have limitations in processing time (10-60 seconds), so the beat detection may need optimization.

2. **Filesystem Access**: Vercel doesn't provide persistent filesystem storage, which may affect file storage capabilities.

3. **Backend Requirement**: You must deploy your backend separately, as Vercel is primarily designed for frontend deployments.

## License

[Your License Information]

## Portable Setup Instructions

These instructions are designed to help you set up and run the application on any macOS or Ubuntu machine.

### Prerequisites

- Python 3.13+ (required for the ML model)
- Node.js and npm (for the frontend)
- Git (to clone the repository)

### Quick Setup (macOS and Ubuntu)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dance_app
   ```

2. **Make scripts executable**
   ```bash
   chmod +x portable_setup.sh portable_start.sh
   ```

3. **Run the setup script**
   ```bash
   ./portable_setup.sh
   ```
   This script will:
   - Create a Python virtual environment
   - Install all required dependencies
   - Download the ML model
   - Set up the frontend

4. **Start the application**
   ```bash
   ./portable_start.sh
   ```
   This will start both the backend and frontend services.

5. **Access the application**
   - The application will be available at: http://localhost:3000 (or the port shown in the terminal)
   - Press Ctrl+C at any time to stop all services

### Troubleshooting

- If the setup fails with Python version errors, ensure you have Python 3.13+ installed
- Check the logs in the `logs` directory for detailed error messages
- If the model download fails, you can manually download it from: https://github.com/CPJKU/beat_this/raw/main/checkpoints/final0.ckpt

### Moving to a VM

1. **Copy the entire directory to your VM**
   ```bash
   scp -r dance_app user@your-vm-ip:~/
   ```

2. **SSH into your VM**
   ```bash
   ssh user@your-vm-ip
   ```

3. **Install prerequisites (on Ubuntu)**
   ```bash
   sudo apt update
   sudo apt install python3 python3-venv python3-pip nodejs npm ffmpeg
   ```

4. **Run the setup and start scripts as described above**

## Local Development

If you prefer a manual setup, follow these steps:

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   By default, the API URL is set to `http://localhost:7081` for local development.

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the backend server**
   ```bash
   ./start_all.sh
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```

## Deployment to Vercel

See the [Deployment to Vercel](./DEPLOYMENT.md) guide for detailed instructions on deploying this application to production.

## License

[Your License Information] 