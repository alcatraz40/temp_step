#!/usr/bin/env python3
"""
Script to download the beat_this model checkpoint.
"""

import os
import urllib.request
import shutil
import sys

# Model checkpoint URL
MODEL_URL = "https://github.com/CPJKU/beat_this/raw/main/checkpoints/final0.ckpt"

# Default download directory
DEFAULT_DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def download_model(output_dir=DEFAULT_DOWNLOAD_DIR):
    """Download the model checkpoint to the specified directory."""
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Output file path
    output_file = os.path.join(output_dir, "final0.ckpt")
    
    # Check if model already exists
    if os.path.exists(output_file):
        print(f"Model checkpoint already exists at {output_file}")
        response = input("Do you want to download it again? (y/n): ")
        if response.lower() != 'y':
            print("Download cancelled.")
            return output_file
    
    print(f"Downloading model checkpoint from {MODEL_URL}...")
    
    # Download with progress reporting
    try:
        with urllib.request.urlopen(MODEL_URL) as response, open(output_file, 'wb') as out_file:
            # Get file size from headers if available
            file_size = int(response.headers.get('Content-Length', 0))
            
            # Set up progress reporting
            if file_size > 0:
                print(f"File size: {file_size / (1024 * 1024):.2f} MB")
                
                downloaded = 0
                block_size = 8192  # 8KB chunks
                
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    
                    out_file.write(buffer)
                    downloaded += len(buffer)
                    
                    # Update progress
                    progress = int(50 * downloaded / file_size)
                    sys.stdout.write(f"\r[{'=' * progress}{' ' * (50 - progress)}] {downloaded / (1024 * 1024):.2f}/{file_size / (1024 * 1024):.2f} MB")
                    sys.stdout.flush()
                
                sys.stdout.write('\n')
            else:
                # If file size unknown, just copy the data
                shutil.copyfileobj(response, out_file)
        
        print(f"Model checkpoint downloaded successfully to {output_file}")
        return output_file
    
    except Exception as e:
        print(f"Error downloading model: {e}")
        return None


if __name__ == "__main__":
    # Allow an optional output directory as command line argument
    output_dir = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DOWNLOAD_DIR
    download_model(output_dir) 