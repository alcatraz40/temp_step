import os
import json
import shutil
import yt_dlp
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def download_youtube_video(video_url, output_dir):
    """
    Downloads a YouTube video using yt-dlp and returns metadata
    
    Args:
        video_url: YouTube URL
        output_dir: Directory to save the video
        
    Returns:
        dict: Contains video_path, video_id, and metadata
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Configure yt-dlp options
        ydl_opts = {
            'format': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
            'merge_output_format': 'mp4',
            'outtmpl': os.path.join(output_dir, '%(id)s.%(ext)s'),
            'quiet': False,
            'no_warnings': False,
            'writeinfojson': True,  # Save video metadata
            'writethumbnail': True,  # Save thumbnail
        }
        
        # Extract info first to get video_id
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            video_id = info.get('id')
            
            # Then download
            logger.info(f"Downloading video {video_id} from YouTube...")
            ydl.download([video_url])
            
        # Define file paths
        video_path = os.path.join(output_dir, f"{video_id}.mp4")
        info_path = os.path.join(output_dir, f"{video_id}.info.json")
        thumb_path = None
        
        # Find thumbnail file
        for ext in ['.jpg', '.png', '.webp']:
            potential_thumb = os.path.join(output_dir, f"{video_id}{ext}")
            if os.path.exists(potential_thumb):
                thumb_path = potential_thumb
                break
        
        # Load metadata
        with open(info_path, 'r') as f:
            metadata = json.load(f)
        
        return {
            'video_path': video_path,
            'video_id': video_id,
            'thumbnail_path': thumb_path,
            'metadata': metadata,
            'title': metadata.get('title', ''),
            'duration': metadata.get('duration', 0)
        }
    
    except Exception as e:
        logger.error(f"Error downloading video: {str(e)}")
        raise
        
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
            'quiet': True,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'wav',
                'preferredquality': '192',
            }],
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'file:{video_path}'])
            
        # The output will be a WAV file
        return f"{os.path.splitext(audio_output_path)[0]}.wav"
    
    except Exception as e:
        logger.error(f"Error extracting audio: {str(e)}")
        raise 