import yt_dlp
import os
import subprocess
import sys

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
        tuple: (video_path, audio_path)
    """
    # First, check for FFmpeg
    if not check_ffmpeg_installation():
        print("Warning: FFmpeg doesn't appear to be installed or is not in PATH")
        print("You may need to install FFmpeg for video+audio merging to work properly")
        print("For Ubuntu/Debian: sudo apt install ffmpeg")
        print("For MacOS: brew install ffmpeg")
        print("For Windows: download from https://ffmpeg.org/download.html")
        print("Continuing with download attempt...")
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # First, extract video info to get the ID
    with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
        info = ydl.extract_info(video_url, download=False)
        video_id = info.get('id', 'video')
    
    video_path = None
    audio_path = None
    
    # Set up video+audio download options with fallback
    # Use video_id for filename
    video_filename = os.path.join(output_dir, f"{video_id}")
    
    # Try downloading with merging first
    try:
        print(f"Downloading video+audio for {video_id}...")
        video_opts = {
            'format': 'bestvideo+bestaudio/best',
            'merge_output_format': 'mp4',
            'outtmpl': f'{video_filename}.%(ext)s',
            'quiet': False,
            'progress': True,
        }
        
        with yt_dlp.YoutubeDL(video_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            video_path = f"{video_filename}.{info.get('ext', 'mp4')}"
    
    except Exception as e:
        print(f"Error with merged download: {e}")
        print("Trying alternative download method...")
        
        # Fallback to downloading best available format without merging
        try:
            video_opts_fallback = {
                'format': 'best',  # Just get best available combined format
                'outtmpl': f'{video_filename}_fallback.%(ext)s',
                'quiet': False,
                'progress': True,
            }
            
            with yt_dlp.YoutubeDL(video_opts_fallback) as ydl:
                info = ydl.extract_info(video_url, download=True)
                video_path = f"{video_filename}_fallback.{info.get('ext', 'mp4')}"
                print(f"Successfully downloaded with fallback method to {video_path}")
        
        except Exception as fallback_error:
            print(f"Fallback download also failed: {fallback_error}")
    
    # Set up audio-only download options
    # Use video_id for filename
    audio_filename = os.path.join(output_dir, f"{video_id}_audio")
    
    try:
        print(f"Downloading audio only for {video_id}...")
        audio_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': f'{audio_filename}.%(ext)s',
            'quiet': False,
            'progress': True,
        }
        
        with yt_dlp.YoutubeDL(audio_opts) as ydl:
            ydl.extract_info(video_url, download=True)
            # Audio path will have the format extension changed by the postprocessor
            audio_path = f"{audio_filename}.mp3"
    
    except Exception as e:
        print(f"Error downloading audio: {e}")
        print("Trying alternative audio download method...")
        
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
                print(f"Successfully downloaded audio with fallback method to {audio_path}")
        
        except Exception as fallback_error:
            print(f"Fallback audio download also failed: {fallback_error}")
    
    return video_path, audio_path


video_url = "https://www.youtube.com/watch?v=_gfSDD7KpLA"


# Download video and audio
try:
    video_path, audio_path = download_video_and_audio(video_url)
    
    success_message = "\nDownload results:"
    if video_path and os.path.exists(video_path):
        success_message += f"\nVideo path: {os.path.abspath(video_path)}"
    else:
        success_message += "\nVideo download failed or file not found."
        
    if audio_path and os.path.exists(audio_path):
        success_message += f"\nAudio path: {os.path.abspath(audio_path)}"
    else:
        success_message += "\nAudio download failed or file not found."
        
    print(success_message)
    
except Exception as e:
    print(f"An unexpected error occurred: {e}")

