import os
import logging
import tempfile
import re
import time
import yt_dlp
from pydub import AudioSegment
import logging.handlers

# Configure logging - Simplified approach
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "simple_youtube.log")

# Create a logger for this module
logger = logging.getLogger('simple_youtube')

# Check if the logger already has handlers to avoid duplicates
if not logger.handlers:
    # Add a file handler
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    logger.setLevel(logging.INFO)

# Test write to log file
try:
    with open(LOG_FILE, 'a') as f:
        f.write("SimpleYouTubeDownloader initialized\n")
    logger.info("Successfully wrote to simple_youtube log file")
except Exception as e:
    logger.error(f"Error writing to simple_youtube log file: {str(e)}")

logger.info("Simple YouTube downloader logging initialized")

class SimpleYouTubeDownloader:
    """
    A simplified YouTube downloader that focuses on reliability using yt-dlp.
    """
    
    def __init__(self):
        """Initialize the downloader."""
        logger.info("Initializing SimpleYouTubeDownloader with yt-dlp")
    
    def download_audio(self, youtube_url, output_dir=None, max_retries=2):
        """
        Download audio from a YouTube video using yt-dlp.
        
        Args:
            youtube_url (str): URL of the YouTube video
            output_dir (str, optional): Directory to save the audio file
            max_retries (int): Maximum number of retry attempts
            
        Returns:
            tuple: (file_path, duration, title) or (None, None, None) on failure
        """
        if output_dir is None:
            output_dir = tempfile.mkdtemp()
            logger.info(f"Created temporary directory: {output_dir}")
        
        logger.info(f"Downloading audio from {youtube_url}")
        
        # Final output WAV file
        output_file = os.path.join(output_dir, "audio.wav")
        
        # Try to download with a few retries
        for attempt in range(max_retries + 1):
            try:
                logger.info(f"Download attempt {attempt + 1}/{max_retries + 1}")
                
                # Configure yt-dlp options with more reliable settings
                ydl_opts = {
                    'format': 'bestaudio/best',
                    'outtmpl': os.path.join(output_dir, 'temp_audio.%(ext)s'),
                    'postprocessors': [{
                        'key': 'FFmpegExtractAudio',
                        'preferredcodec': 'wav',
                        'preferredquality': '192',
                    }],
                    'quiet': False,
                    'no_warnings': False,
                    'noplaylist': True,
                    'ignoreerrors': True,  # Skip unavailable videos
                    'no_color': True,  # No colored output
                    'geo_bypass': True,  # Bypass geographic restriction
                    'retries': 5,  # Retry on network errors
                }
                
                # Download and convert the video
                start_time = time.time()
                logger.info("Starting download with yt-dlp using optimized settings...")
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=True)
                    title = info.get('title', 'Unknown Title')
                    duration = info.get('duration', 0)
                    filename = ydl.prepare_filename(info)
                    wav_path = os.path.splitext(filename)[0] + '.wav'
                
                download_time = time.time() - start_time
                logger.info(f"Download and conversion completed in {download_time:.2f} seconds")
                
                # Rename the file to our standard name
                if os.path.exists(wav_path) and os.path.isfile(wav_path):
                    os.rename(wav_path, output_file)
                    logger.info(f"Renamed {wav_path} to {output_file}")
                else:
                    logger.warning(f"Expected WAV file not found at {wav_path}, using as-is")
                    output_file = wav_path
                
                # Verify the WAV file exists and has content
                if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
                    logger.info(f"Successfully downloaded and converted audio: {output_file}")
                    logger.info(f"Title: {title}, Duration: {duration}s")
                    return output_file, duration, title
                else:
                    logger.error(f"Output file is missing or empty: {output_file}")
            
            except Exception as e:
                logger.error(f"Error during download attempt {attempt + 1}: {str(e)}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying in 2 seconds...")
                    time.sleep(2)
                else:
                    logger.error(f"Failed after {max_retries + 1} attempts")
        
        # If all attempts failed, return None
        return None, None, None
    
    def extract_video_id(self, url):
        """
        Extract the video ID from a YouTube URL.
        
        Args:
            url (str): YouTube URL
            
        Returns:
            str: Video ID or None if not found
        """
        try:
            # First try using yt-dlp
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info_dict = ydl.extract_info(url, download=False)
                return info_dict.get('id')
        except Exception as e:
            logger.warning(f"Error extracting video ID using yt-dlp: {str(e)}")
            
            # Fallback: Use regex pattern to extract video ID
            patterns = [
                r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
                r'(?:embed|v|vi)\/([0-9A-Za-z_-]{11})',
                r'(?:watch\?v=|youtu\.be\/)([0-9A-Za-z_-]{11})'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    return match.group(1)
        
        logger.error(f"Could not extract video ID from URL: {url}")
        return None

# Simple test for the module
if __name__ == "__main__":
    downloader = SimpleYouTubeDownloader()
    file_path, duration, title = downloader.download_audio("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    if file_path:
        print(f"Downloaded: {title}, Duration: {duration}s, File: {file_path}")
    else:
        print("Download failed") 