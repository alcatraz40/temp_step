import os
import json
import shutil
import yt_dlp
import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

def check_ffmpeg_installation():
    """Check if FFmpeg is installed and accessible"""
    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def download_video_and_audio(video_url, output_dir="downloads"):
    """
    Downloads both video+audio and audio-only files from a given URL,
    naming files by the video ID, and returns the filepaths.
    Includes improved error handling.
    
    Args:
        video_url (str): URL of the video to download
        output_dir (str): Directory to save downloads
        
    Returns:
        dict: Contains video_path, audio_path, video_id, metadata, etc.
    """
    # First, check for FFmpeg
    if not check_ffmpeg_installation():
        logger.warning("FFmpeg doesn't appear to be installed or is not in PATH")
        logger.warning("You may need to install FFmpeg for video+audio merging to work properly")
        logger.warning("For Ubuntu/Debian: sudo apt install ffmpeg")
        logger.warning("For MacOS: brew install ffmpeg")
        logger.warning("For Windows: download from https://ffmpeg.org/download.html")
        logger.warning("Continuing with download attempt...")
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # First, extract video info to get the ID
    with yt_dlp.YoutubeDL({'quiet': True, 'writeinfojson': True}) as ydl:
        info = ydl.extract_info(video_url, download=False)
        video_id = info.get('id', 'video')
        duration = info.get('duration', 0)
        title = info.get('title', 'Unknown Video')
    
    video_path = None
    audio_path = None
    
    # Set up video+audio download options with fallback
    # Use video_id for filename
    video_filename = os.path.join(output_dir, f"{video_id}")
    
    # Try downloading with merging first
    try:
        logger.info(f"Downloading video+audio for {video_id}...")
        video_opts = {
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'outtmpl': f'{video_filename}.%(ext)s',
            'quiet': False,
            'progress': True,
            'writeinfojson': True,  # Save video metadata
            'writethumbnail': True,  # Save thumbnail
        }
        
        with yt_dlp.YoutubeDL(video_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            video_path = f"{video_filename}.{info.get('ext', 'mp4')}"
    
    except Exception as e:
        logger.error(f"Error with merged download: {e}")
        logger.info("Trying alternative download method...")
        
        # Fallback to downloading best available format without merging
        try:
            video_opts_fallback = {
                'format': 'best',  # Just get best available combined format
                'outtmpl': f'{video_filename}_fallback.%(ext)s',
                'quiet': False,
                'progress': True,
                'writeinfojson': True,  # Save video metadata
                'writethumbnail': True,  # Save thumbnail
            }
            
            with yt_dlp.YoutubeDL(video_opts_fallback) as ydl:
                info = ydl.extract_info(video_url, download=True)
                video_path = f"{video_filename}_fallback.{info.get('ext', 'mp4')}"
                logger.info(f"Successfully downloaded with fallback method to {video_path}")
        
        except Exception as fallback_error:
            logger.error(f"Fallback download also failed: {fallback_error}")
    
    # Set up audio-only download options
    # Use video_id for filename
    audio_filename = os.path.join(output_dir, f"{video_id}_audio")
    
    try:
        logger.info(f"Downloading audio only for {video_id}...")
        audio_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'outtmpl': f'{audio_filename}.%(ext)s',
            'quiet': False,
            'progress': True,
        }
        
        with yt_dlp.YoutubeDL(audio_opts) as ydl:
            ydl.extract_info(video_url, download=True)
            # Audio path will have the format extension changed by the postprocessor
            audio_path = f"{audio_filename}.wav"
    
    except Exception as e:
        logger.error(f"Error downloading audio: {e}")
        logger.info("Trying alternative audio download method...")
        
        try:
            # Fallback to simpler audio download without post-processing
            audio_opts_fallback = {
                'format': 'bestaudio',
                'outtmpl': f'{audio_filename}_fallback.%(ext)s',
                'quiet': False,
                'progress': True,
            }
            
            with yt_dlp.YoutubeDL(audio_opts_fallback) as ydl:
                info = ydl.extract_info(video_url, download=True)
                audio_path = f"{audio_filename}_fallback.{info.get('ext', 'webm')}"
                logger.info(f"Successfully downloaded audio with fallback method to {audio_path}")
        
        except Exception as fallback_error:
            logger.error(f"Fallback audio download also failed: {fallback_error}")
    
    if not video_path or not os.path.exists(video_path):
        logger.error(f"Video download failed or file not found at {video_path}")
    
    if not audio_path or not os.path.exists(audio_path):
        logger.error(f"Audio download failed or file not found at {audio_path}")
    
    # Find thumbnail file
    thumb_path = None
    for ext in ['.jpg', '.png', '.webp']:
        potential_thumb = os.path.join(output_dir, f"{video_id}{ext}")
        if os.path.exists(potential_thumb):
            thumb_path = potential_thumb
            break
    
    # Load metadata if available
    info_path = os.path.join(output_dir, f"{video_id}.info.json")
    metadata = {}
    if os.path.exists(info_path):
        with open(info_path, 'r') as f:
            metadata = json.load(f)
    else:
        # Create basic metadata if info.json not available
        metadata = {
            "title": title,
            "duration": duration,
            "id": video_id
        }
    
    return {
        'video_path': video_path,
        'audio_path': audio_path,
        'video_id': video_id,
        'thumbnail_path': thumb_path,
        'metadata': metadata,
        'title': metadata.get('title', ''),
        'duration': metadata.get('duration', 0)
    }

# Keep extract_audio_from_video for compatibility, but make it simpler using the new function
def extract_audio_from_video(video_path, audio_output_path):
    """
    Extracts audio from a video file and saves as WAV
    
    Args:
        video_path: Path to video file
        audio_output_path: Path to save audio file
        
    Returns:
        str: Path to the extracted audio file
    """
    try:
        # Ensure output directory exists
        os.makedirs(os.path.dirname(audio_output_path), exist_ok=True)
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': audio_output_path,
            'quiet': False,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
            'ignoreerrors': True,
            'no_color': True,
            'retries': 3,
        }
        
        logger.info(f"Extracting audio from {video_path} using enhanced settings...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'file:{video_path}'])
            
        # The output will be a WAV file
        return f"{os.path.splitext(audio_output_path)[0]}.wav"
    
    except Exception as e:
        logger.error(f"Error extracting audio: {str(e)}")
        raise

# For backwards compatibility
def download_youtube_video(video_url, output_dir):
    """
    Wrapper around download_video_and_audio for backward compatibility
    """
    try:
        result = download_video_and_audio(video_url, output_dir)
        return result
    except Exception as e:
        logger.error(f"Error in download_youtube_video: {str(e)}")
        raise 