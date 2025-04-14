import re
import logging
import os
import signal
import io
import base64
import numpy as np
import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
from pytube import YouTube
import random
from beat_detector import BeatDetector
import traceback
import tempfile
import shutil
from simple_youtube import SimpleYouTubeDownloader
from video_downloader import download_youtube_video, extract_audio_from_video

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('backend')

app = FastAPI()

# Create a static files directory if it doesn't exist
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

# Create a videos directory for downloaded videos
VIDEOS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
os.makedirs(VIDEOS_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")

# CORS Configuration - Allow all origins for development purposes
logger.info("Setting up CORS middleware with permissive configuration for development")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specify methods explicitly
    allow_headers=["*"],  # Allow all headers
    expose_headers=["Content-Type", "Content-Disposition"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Initialize the simple YouTube downloader
youtube_downloader = SimpleYouTubeDownloader()

# Store progress information for each video ID
video_progress = {}

class VideoRequest(BaseModel):
    url: str

class VideoResponse(BaseModel):
    videoId: str
    duration: float
    steps: list
    audio_with_clicks_url: str
    waveform_image: str
    progress: int = 0
    status_message: str = "Initializing"
    video_url: str = ""    # Added this for the local video URL

class ProgressResponse(BaseModel):
    videoId: str
    progress: int
    status_message: str

def extract_video_id(url: str) -> str:
    """Extract video ID from various YouTube URL formats."""
    logger.info(f"Extracting video ID from URL: {url}")
    
    # Use the simple YouTube downloader to extract video ID
    video_id = youtube_downloader.extract_video_id(url)
    
    if video_id:
        logger.info(f"Extracted video ID: {video_id}")
        return video_id
    
    # Fallback to our own parsing logic
    # Check for playlist URLs first and reject them
    playlist_patterns = [
        r'youtube\.com/playlist\?list=',
        r'youtube\.com/watch\?v=.*&list=',
        r'youtube\.com/watch\?list=',
        r'youtu\.be/.*\?list=',
        r'youtube\.com/.*[?&]list=RD',
        r'youtube\.com/channel/.*/playlists',
    ]
    
    for pattern in playlist_patterns:
        if re.search(pattern, url):
            logger.error(f"URL appears to be a playlist, which is not supported: {url}")
            raise ValueError("YouTube playlists are not supported. Please provide a URL to a single video.")
    
    # Regular YouTube video URL patterns
    youtube_regex = (
        r'(https?://)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)/'
        r'(watch\?v=|embed/|v/|.+\?v=)?([^&=%\?]{11})'
    )
    match = re.match(youtube_regex, url)
    
    if match:
        video_id = match.group(6)
        logger.info(f"Extracted video ID: {video_id}")
        return video_id
    
    logger.error(f"Could not extract video ID from URL: {url}")
    raise ValueError("Invalid YouTube URL format. Please provide a direct link to a YouTube video.")

def update_progress(video_id, progress, message):
    """Update progress information for a video."""
    # Simple progress update
    logger.info(f"Progress update for {video_id}: {progress}% - {message}")
    video_progress[video_id] = {"progress": progress, "status_message": message}

@app.get("/")
async def root():
    return {"message": "Dance Learning Backend API"}

@app.get("/api/health")
async def health_check(request: Request):
    """Health check endpoint for debugging connectivity issues."""
    logger.info(f"Health check request received from {request.client.host}")
    
    # Get request origin for debugging
    origin = request.headers.get("origin", "Unknown")
    
    # Return diagnostic information
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": asyncio.get_event_loop().time(),
        "client_info": {
            "ip": request.client.host,
            "port": request.client.port,
            "origin": origin,
            "user_agent": request.headers.get("user-agent", "Unknown"),
        },
        "request_headers": dict(request.headers),
        "cors_config": {
            "allow_origins": ["*"],  # This should match your middleware config
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["*"],
            "max_age": 3600,
        },
        "server_info": {
            "hostname": os.uname().nodename if hasattr(os, 'uname') else "Unknown",
            "python_version": os.sys.version,
            "backend_dir": os.path.dirname(os.path.abspath(__file__)),
            "static_dir": STATIC_DIR,
        }
    }

@app.get("/api/progress/{video_id}")
async def get_progress(video_id: str):
    """Get the current progress of video analysis."""
    logger.info(f"Progress request received for video: {video_id}")
    
    if video_id in video_progress:
        progress_info = video_progress[video_id]
        
        # Check if the progress has complete data
        if "data" in progress_info and progress_info["progress"] == 100:
            # Return both progress info and the complete data
            return progress_info["data"]
        else:
            # Return just progress info
            return ProgressResponse(
                videoId=video_id,
                progress=progress_info["progress"],
                status_message=progress_info["status_message"]
            )
    else:
        logger.warning(f"No progress found for video ID: {video_id}")
        return ProgressResponse(
            videoId=video_id,
            progress=0,
            status_message="Not started or ID not found"
        )

@app.post("/api/analyze-video")
async def analyze_video(request: VideoRequest, background_tasks: BackgroundTasks):
    """
    Analyze a YouTube video to detect dance beats and generate steps.
    """
    try:
        logger.info(f"Received request to analyze video: {request.url}")
        
        # Validate URL format early
        if not re.match(r'https?://(www\.)?(youtube\.com|youtu\.be)/.+', request.url):
            logger.error(f"Invalid YouTube URL format: {request.url}")
            raise ValueError("Invalid YouTube URL format. Please provide a valid YouTube video URL.")
            
        # Check for playlist links early
        if 'list=' in request.url or 'playlist' in request.url or '/p/' in request.url or 'RDCLAK5' in request.url:
            logger.error(f"Playlist URL detected: {request.url}")
            raise ValueError("Playlist URLs are not supported. Please provide a direct video URL.")
        
        try:
            video_id = extract_video_id(request.url)
        except ValueError as e:
            logger.error(f"Failed to extract video ID: {str(e)}")
            raise ValueError(f"Invalid YouTube URL: {str(e)}")
        
        # Initialize progress tracking for this video
        update_progress(video_id, 0, "Starting analysis")
        
        # Create a unique directory for this video
        video_dir = os.path.join(STATIC_DIR, video_id)
        os.makedirs(video_dir, exist_ok=True)

        # Add the analysis task to the background tasks
        background_tasks.add_task(run_analysis_in_background, request.url, video_id)
        
        # Return immediate response with just the video ID
        return {
            "videoId": video_id,
            "progress": 0,
            "status_message": "Starting analysis..."
        }
            
    except ValueError as e:
        logger.error(f"Invalid input: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

async def run_analysis_in_background(url, video_id):
    """Run the video analysis in the background"""
    logger.info(f"Starting background analysis for video {video_id}")
    
    try:
        # Create a unique directory for this video
        video_dir = os.path.join(STATIC_DIR, video_id)
        
        # Create a videos directory for this video ID
        video_output_dir = os.path.join(VIDEOS_DIR, video_id)
        os.makedirs(video_output_dir, exist_ok=True)
        
        # Download the video using yt-dlp
        update_progress(video_id, 5, "Downloading video from YouTube...")
        try:
            video_info = download_youtube_video(url, video_output_dir)
            logger.info(f"Successfully downloaded video: {video_info['video_path']}")
            
            # Create symbolic link to the video in static directory
            video_path = video_info['video_path']
            static_video_path = os.path.join(video_dir, "video.mp4")
            
            # Copy the video file to the static directory
            logger.info(f"Copying video file to static directory: {static_video_path}")
            shutil.copy2(video_path, static_video_path)
            
            # Also copy the thumbnail if available
            if video_info['thumbnail_path']:
                thumbnail_ext = os.path.splitext(video_info['thumbnail_path'])[1]
                static_thumb_path = os.path.join(video_dir, f"thumbnail{thumbnail_ext}")
                shutil.copy2(video_info['thumbnail_path'], static_thumb_path)
            
            # Set video duration from metadata
            duration = video_info['duration']
            
            # Update relative video path for frontend
            video_url = f"/videos/{video_id}/{os.path.basename(video_path)}"
            logger.info(f"Video available at: {video_url}")
            
            update_progress(video_id, 15, "Video downloaded successfully")
        except Exception as download_e:
            logger.error(f"Error downloading video: {str(download_e)}")
            logger.error(traceback.format_exc())
            # Fallback to the original YouTube ID for streaming if download fails
            video_url = ""
            # Use a default duration if needed
            duration = 180  # 3 minutes default
            update_progress(video_id, 15, "Video download failed, using YouTube player as fallback")
        
        # Initialize the beat detector with a progress callback
        detector = BeatDetector(tolerance=0.05)
        
        # Create a progress callback
        def progress_callback(percent, message):
            # Scale the percent to start from 15% (after download) to 95%
            scaled_percent = 15 + int(percent * 0.8)
            update_progress(video_id, scaled_percent, message)
        
        # Analyze the video with progress tracking
        logger.info(f"Starting beat detection for video {video_id}")
        results = detector.analyze_video(url, progress_callback=progress_callback)
        logger.info(f"Beat detection completed for video {video_id}")
        
        # Copy audio with clicks to static directory
        audio_url = ""
        if 'audio_with_clicks' in results and results['audio_with_clicks'] and os.path.exists(results['audio_with_clicks']):
            static_audio_path = os.path.join(video_dir, "audio_with_clicks.wav")
            logger.info(f"Copying audio with clicks to {static_audio_path}")
            shutil.copy2(results['audio_with_clicks'], static_audio_path)
            audio_url = f"/static/{video_id}/audio_with_clicks.wav"
        else:
            logger.warning("Audio with clicks not generated")
            
        # Copy harmonic audio with clicks to static directory
        harmonic_audio_url = ""
        if 'harmonic_with_clicks' in results and results['harmonic_with_clicks'] and os.path.exists(results['harmonic_with_clicks']):
            static_harmonic_path = os.path.join(video_dir, "harmonic_with_clicks.wav")
            logger.info(f"Copying harmonic audio with clicks to {static_harmonic_path}")
            shutil.copy2(results['harmonic_with_clicks'], static_harmonic_path)
            harmonic_audio_url = f"/static/{video_id}/harmonic_with_clicks.wav"
        else:
            logger.warning("Harmonic audio with clicks not generated")
            
        # Copy percussive audio with clicks to static directory
        percussive_audio_url = ""
        if 'percussive_with_clicks' in results and results['percussive_with_clicks'] and os.path.exists(results['percussive_with_clicks']):
            static_percussive_path = os.path.join(video_dir, "percussive_with_clicks.wav")
            logger.info(f"Copying percussive audio with clicks to {static_percussive_path}")
            shutil.copy2(results['percussive_with_clicks'], static_percussive_path)
            percussive_audio_url = f"/static/{video_id}/percussive_with_clicks.wav"
        else:
            logger.warning("Percussive audio with clicks not generated")
        
        # Also copy the original harmonic and percussive files
        harmonic_url = ""
        if 'harmonic_path' in results and results['harmonic_path'] and os.path.exists(results['harmonic_path']):
            static_harmonic_path = os.path.join(video_dir, "harmonic.wav")
            logger.info(f"Copying harmonic audio to {static_harmonic_path}")
            shutil.copy2(results['harmonic_path'], static_harmonic_path)
            harmonic_url = f"/static/{video_id}/harmonic.wav"
            
        percussive_url = ""
        if 'percussive_path' in results and results['percussive_path'] and os.path.exists(results['percussive_path']):
            static_percussive_path = os.path.join(video_dir, "percussive.wav")
            logger.info(f"Copying percussive audio to {static_percussive_path}")
            shutil.copy2(results['percussive_path'], static_percussive_path)
            percussive_url = f"/static/{video_id}/percussive.wav"
        
        # Copy clicks-only audio to static directory
        clicks_only_url = ""
        if 'clicks_only' in results and results['clicks_only'] and os.path.exists(results['clicks_only']):
            static_clicks_path = os.path.join(video_dir, "clicks_only.wav")
            logger.info(f"Copying clicks-only audio to {static_clicks_path}")
            shutil.copy2(results['clicks_only'], static_clicks_path)
            clicks_only_url = f"/static/{video_id}/clicks_only.wav"
        else:
            logger.warning("Clicks-only audio not generated")
        
        # Save waveform image if available
        waveform_image = ""
        if 'waveform_image' in results and results['waveform_image']:
            logger.info(f"Waveform image received")
            
            # Check if the image data already includes the data:image prefix
            if isinstance(results['waveform_image'], str) and not results['waveform_image'].startswith('data:image'):
                waveform_image = results['waveform_image']
            else:
                # If it's already prefixed, use it as is
                waveform_image = results['waveform_image']
        else:
            logger.warning("No waveform image data available")
            waveform_image = ""
        
        # Update progress to complete with the finished data
        video_progress[video_id] = {
            "progress": 100, 
            "status_message": "Analysis complete",
            "data": {
                "videoId": video_id,
                "duration": results["duration"],
                "beats": results["beats"],
                "downbeats": results["downbeats"] if "downbeats" in results else [],
                "steps": results["steps"] if "steps" in results else [],
                "tempo": results["tempo"],
                "audio_with_clicks_url": audio_url,
                "harmonic_audio_url": harmonic_audio_url,
                "percussive_audio_url": percussive_audio_url,
                "harmonic_original_url": harmonic_url,
                "percussive_original_url": percussive_url,
                "clicks_only_url": clicks_only_url,
                "waveform_image": waveform_image,
                "video_url": video_url
            }
        }
        
        logger.info(f"Background analysis complete for video {video_id}. Found {len(results['beats'])} beats and {len(results['downbeats'] if 'downbeats' in results else [])} downbeats.")
        
    except Exception as e:
        logger.error(f"Error in background analysis: {str(e)}")
        logger.error(traceback.format_exc())
        update_progress(video_id, 100, f"Error: {str(e)}")

@app.get("/api/audio/{video_id}")
async def get_audio_with_clicks(video_id: str):
    """
    Serve the audio file with clicks for a specific video.
    """
    audio_path = os.path.join(STATIC_DIR, video_id, "audio_with_clicks.wav")
    
    if not os.path.exists(audio_path):
        logger.error(f"Audio file not found: {audio_path}")
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(audio_path, media_type="audio/wav")

@app.get("/api/video/{video_id}")
async def get_video(video_id: str):
    """
    Serve the downloaded video file for a specific video ID.
    """
    video_path = os.path.join(STATIC_DIR, video_id, "video.mp4")
    
    if not os.path.exists(video_path):
        logger.error(f"Video file not found: {video_path}")
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(video_path, media_type="video/mp4")

@app.get("/api/thumbnail/{video_id}")
async def get_thumbnail(video_id: str):
    """
    Serve the thumbnail image for a specific video ID.
    """
    # Try to find the thumbnail file with different extensions
    for ext in ['.jpg', '.png', '.webp']:
        thumb_path = os.path.join(STATIC_DIR, video_id, f"thumbnail{ext}")
        if os.path.exists(thumb_path):
            media_type = f"image/{ext[1:]}"
            if ext == '.jpg':
                media_type = "image/jpeg"
            return FileResponse(thumb_path, media_type=media_type)
    
    # If no thumbnail found, return a 404
    logger.error(f"Thumbnail not found for video ID: {video_id}")
    raise HTTPException(status_code=404, detail="Thumbnail not found")

@app.post("/api/analyze-video-dummy")
async def analyze_video_dummy(request: VideoRequest):
    """
    Legacy endpoint that generates dummy steps based on video duration.
    Uses pytube instead of yt-dlp for potential better success with anti-bot measures.
    """
    try:
        logger.info(f"Received request to analyze video (dummy): {request.url}")
        
        video_id = extract_video_id(request.url)
        
        try:
            # Get video details using our simple downloader - more reliable than direct pytube
            logger.info(f"Fetching video information using simple downloader: {request.url}")
            
            # Create a temporary directory for the dummy analysis
            temp_dir = tempfile.mkdtemp()
            
            # Try to get basic video info without downloading audio
            _, duration, title = youtube_downloader.download_audio(request.url, temp_dir, max_retries=1)
            
            # If we couldn't get the duration, try using pytube directly
            if not duration:
                try:
                    yt = YouTube(request.url)
                    duration = yt.length  # Duration in seconds
                    title = yt.title
                except Exception as pytube_error:
                    logger.error(f"Pytube error: {str(pytube_error)}")
                    # If all else fails, use a default duration
                    duration = 180  # Default 3 minutes
                    title = "Unknown Video"
            
            logger.info(f"Video duration: {duration} seconds, Title: {title}")
            
            # Create a simple visualization
            waveform_image = create_dummy_waveform(duration)
            
            # Generate 5 equal steps
            num_steps = 5
            step_duration = duration / num_steps
            
            steps = []
            for i in range(num_steps):
                step = {
                    "start": i * step_duration,
                    "end": (i + 1) * step_duration,
                    "description": f"Step {i + 1}"
                }
                steps.append(step)
            
            # Response includes empty audio URLs but includes a waveform
            response = {
                "videoId": video_id,
                "duration": duration,
                "steps": steps,
                "audio_with_clicks_url": "",
                "waveform_image": waveform_image,
                "is_dummy_data": True  # Flag to indicate this is fallback data
            }
            
            logger.info(f"Generated {len(steps)} dummy steps (fallback mode)")
            return response
            
        except Exception as e:
            # Log the full traceback for debugging
            logger.error(f"Error generating dummy data: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Could not generate fallback data: {str(e)}")

    except ValueError as e:
        logger.error(f"Invalid input: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

def create_dummy_waveform(duration):
    """
    Create a simple dummy waveform visualization with random points.
    
    Args:
        duration (float): Duration in seconds
        
    Returns:
        str: Base64 encoded PNG image
    """
    try:
        # Create a simple visualization with matplotlib
        plt.figure(figsize=(12, 4))
        
        # Generate dummy data
        time_points = np.linspace(0, duration, int(duration * 10))
        amplitude = np.sin(time_points) * 0.5 + np.random.random(len(time_points)) * 0.5
        
        # Plot waveform
        plt.plot(time_points, amplitude, color='#1DB954', alpha=0.5)
        
        # Plot some random beat markers
        num_beats = min(20, int(duration / 5))
        beat_positions = np.linspace(0, duration, num_beats)
        for beat in beat_positions:
            plt.axvline(x=beat, color='r', alpha=0.7, linewidth=1)
        
        plt.title('Simulated Audio Waveform (Fallback Mode)')
        plt.xlabel('Time (s)')
        plt.ylabel('Amplitude')
        plt.tight_layout()
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=100)
        plt.close()
        
        buffer.seek(0)
        image_data = buffer.getvalue()
        base64_encoded = base64.b64encode(image_data).decode('utf-8')
        
        return base64_encoded
    except Exception as e:
        logger.error(f"Error creating dummy waveform: {str(e)}")
        return ""

@app.on_event("startup")
async def startup_event():
    """
    Initialize the application on startup.
    """
    logger.info("Starting Dance Learning Backend API")
    logger.info(f"Static files directory: {STATIC_DIR}")
    logger.info(f"Videos directory: {VIDEOS_DIR}")
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(VIDEOS_DIR, exist_ok=True)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7081, reload=True) 