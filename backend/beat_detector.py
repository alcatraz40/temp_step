import os
import numpy as np
import librosa
import logging
import soundfile as sf
import tempfile
import time
import traceback
from io import BytesIO
import matplotlib.pyplot as plt
import base64
from scipy.ndimage import gaussian_filter1d
import logging.handlers

# Import beat_this library for ML-based beat detection
try:
    from beat_this.inference import File2Beats
    BEAT_THIS_AVAILABLE = True
except ImportError:
    BEAT_THIS_AVAILABLE = False

# Import the audio separator
try:
    from audio_separator.separator import Separator as AudioSeparator
    AUDIO_SEPARATOR_AVAILABLE = True
except ImportError:
    AUDIO_SEPARATOR_AVAILABLE = False

# Import simple YouTube downloader
from simple_youtube import SimpleYouTubeDownloader

# Configure logging - Simplified approach
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "beat_detector.log")

# Create a logger for this module
logger = logging.getLogger('beat_detector')

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

# Log availability of key components
if BEAT_THIS_AVAILABLE:
    logger.info("beat_this library available for improved beat detection.")
else:
    logger.warning("beat_this library not available. ML-based beat detection will not be available.")

if AUDIO_SEPARATOR_AVAILABLE:
    logger.info("Audio Separator available for improved audio separation.")
else:
    logger.warning("Audio Separator not available. Will use HPSS instead.")

# Test write to log file
try:
    with open(LOG_FILE, 'a') as f:
        f.write("Beat detector initialized\n")
    logger.info("Successfully wrote to beat detector log file")
except Exception as e:
    logger.error(f"Error writing to beat detector log file: {str(e)}")

logger.info("Beat detector logging initialized")

class BeatDetector:
    def __init__(self, tolerance=0.1):
        """Initialize the beat detector with audio separation model
        
        Args:
            tolerance: Global tolerance value for beat detection (in seconds)
        """
        logger.info("Initializing BeatDetector")
        
        # Store tolerance parameter for beat detection operations
        self.tolerance = tolerance
        logger.info(f"Using beat detection tolerance of {self.tolerance}s")
        
        # Initialize audio separator
        try:
            if AUDIO_SEPARATOR_AVAILABLE:
                logger.info("Loading Audio Separator model...")
                self.audio_separator = AudioSeparator()
                self.audio_separator.load_model()
                logger.info("Audio Separator model loaded successfully")
                self.separator_type = "audio_separator"
            else:
                logger.info("No audio separator available. Using HPSS for separation.")
                self.separator_type = "hpss"
        except Exception as e:
            logger.error(f"Error loading audio separation model: {e}")
            self.separator_type = "hpss"
        
        # Initialize the beat detection model if available
        self.beat_this_available = BEAT_THIS_AVAILABLE
        
        if self.beat_this_available:
            try:
                logger.info("Loading beat_this model")
                self.beat_detector = File2Beats(dbn=False)
                logger.info("beat_this model loaded successfully")
            except Exception as e:
                logger.error(f"Error loading beat_this model: {e}")
                self.beat_this_available = False
        
        # Initialize the YouTube downloader
        self.downloader = SimpleYouTubeDownloader()
        
    def download_audio(self, youtube_url, output_dir=None):
        """Download audio from a YouTube video"""
        if output_dir is None:
            output_dir = tempfile.mkdtemp()
        
        logger.info(f"Downloading audio from {youtube_url}")
        output_file, duration, title = self.downloader.download_audio(youtube_url, output_dir)
        
        if output_file and os.path.exists(output_file):
            logger.info(f"Successfully downloaded audio: {title}, Duration: {duration}s")
            return output_file
        else:
            raise ValueError(f"Failed to download audio from {youtube_url}")
    
    def separate_audio(self, audio_file, progress_callback=None):
        """Separate audio into vocals/harmonic and instrumental/percussive components"""
        logger.info(f"Separating audio: {audio_file}")
        if progress_callback:
            progress_callback(0.4, "Starting audio separation process...")
            
        output_dir = os.path.dirname(audio_file)
        base_name = os.path.basename(audio_file).split('.')[0]
        fallback_dir = os.path.join(output_dir, base_name)
        os.makedirs(fallback_dir, exist_ok=True)
        
        harmonic_path = os.path.join(fallback_dir, 'harmonic.wav')
        percussive_path = os.path.join(fallback_dir, 'percussive.wav')
        
        try:
            if self.separator_type == "audio_separator":
                logger.info("Using Audio Separator for vocal/instrumental separation")
                if progress_callback:
                    progress_callback(0.42, "Using advanced audio separator...")
                
                # Use Audio Separator for better separation
                output_files = self.audio_separator.separate(audio_file)
                
                if progress_callback:
                    progress_callback(0.45, "Audio components separated, processing outputs...")
                
                # Find vocals and instrumental files
                vocal_file = None
                instrumental_file = None
                
                for output_file in output_files:
                    if "(Vocals)" in output_file:
                        vocal_file = output_file
                        logger.info(f"Found vocals component: {vocal_file}")
                    elif "(Instrumental)" in output_file:
                        instrumental_file = output_file
                        logger.info(f"Found instrumental component: {instrumental_file}")
                
                if vocal_file and instrumental_file:
                    # Copy files to expected locations (using harmonic/percussive naming for consistency)
                    import shutil
                    logger.info(f"Copying vocals to harmonic path: {harmonic_path}")
                    shutil.copy(vocal_file, harmonic_path)
                    
                    logger.info(f"Copying instrumental to percussive path: {percussive_path}")
                    shutil.copy(instrumental_file, percussive_path)
                    
                    logger.info(f"Audio separated successfully with Audio Separator")
                    if progress_callback:
                        progress_callback(0.48, "Audio separation completed successfully")
                else:
                    raise FileNotFoundError("Audio Separator didn't produce expected output files")
            else:
                # Fallback to HPSS for harmonic/percussive separation
                logger.info("Using HPSS for harmonic-percussive separation")
                if progress_callback:
                    progress_callback(0.42, "Loading audio for separation...")
                
                y, sr = librosa.load(audio_file, sr=None)
                logger.info(f"Audio loaded with sample rate {sr}Hz, duration: {len(y)/sr:.2f}s")
                
                if progress_callback:
                    progress_callback(0.45, "Performing harmonic-percussive separation...")
                
                # Improved HPSS with custom margins
                y_harmonic, y_percussive = librosa.effects.hpss(y, margin=(3.0, 2.0))
                logger.info("HPSS separation completed")
                
                if progress_callback:
                    progress_callback(0.47, "Saving separated audio components...")
                
                # Save to files
                logger.info(f"Saving harmonic component to {harmonic_path}")
                sf.write(harmonic_path, y_harmonic, sr)
                
                logger.info(f"Saving percussive component to {percussive_path}")
                sf.write(percussive_path, y_percussive, sr)
                
                logger.info(f"Created separation using HPSS")
                if progress_callback:
                    progress_callback(0.48, "Audio separation completed")
            
            return harmonic_path, percussive_path
            
        except Exception as e:
            logger.error(f"Error separating audio: {str(e)}")
            logger.error(traceback.format_exc())
            if progress_callback:
                progress_callback(0.4, f"Error in audio separation: {str(e)}")
            raise
    
    def detect_beats_with_beat_this(self, percussive_path):
        """
        Detect beats using the beat_this ML-based model
        
        Args:
            percussive_path: Path to percussive component audio
            
        Returns:
            Arrays of beat times, downbeat times, and estimated tempo
        """
        logger.info(f"Detecting beats with beat_this model from {percussive_path}")
        
        try:
            # Use beat_this model to detect beats and downbeats
            beat_times, downbeat_times = self.beat_detector(percussive_path)
            
            logger.info(f"Detected {len(beat_times)} beats and {len(downbeat_times)} downbeats with beat_this")
            
            # Calculate tempo from beats (average of all consecutive beat intervals)
            if len(beat_times) >= 2:
                intervals = np.diff(beat_times)
                median_interval = np.median(intervals)
                tempo = 60.0 / median_interval
                logger.info(f"Estimated tempo: {tempo:.1f} BPM")
            else:
                tempo = 120.0  # Default fallback
                logger.warning("Not enough beats detected to calculate tempo, using default 120 BPM")
            
            return beat_times, downbeat_times, tempo
            
        except Exception as e:
            logger.error(f"Error using beat_this for beat detection: {str(e)}")
            logger.error(traceback.format_exc())
            # Return empty arrays and default tempo
            return np.array([]), np.array([]), 120.0
    
    def detect_beats(self, harmonic_path, percussive_path, audio_path=None):
        """
        Detect beats using ML-based approach
        
        Args:
            harmonic_path: Path to harmonic component audio
            percussive_path: Path to percussive component audio
            audio_path: Path to original audio (optional)
            
        Returns:
            Array of beat times, downbeat times, and estimated tempo
        """
        logger.info("Starting beat detection")
        
        if not self.beat_this_available:
            logger.error("ML-based beat detection is not available. Please install beat_this library and model.")
            return np.array([]), np.array([])
            
        # Use beat_this for detection
        logger.info("Using beat_this model for beat detection")
        beat_times, downbeat_times, tempo = self.detect_beats_with_beat_this(percussive_path)
        
        logger.info(f"Detected {len(beat_times)} regular beats and {len(downbeat_times)} downbeats")
        logger.info(f"Tempo: {tempo:.1f} BPM")
        
        return beat_times, downbeat_times, tempo
    
    def create_waveform_visualization(self, audio_path, beats, downbeats, output_path=None):
        """Create a basic visualization of waveform with beat markers"""
        try:
            # Load the audio file
            y, sr = librosa.load(audio_path, sr=None)
            
            # Get harmonic and percussive components
            y_harmonic, y_percussive = librosa.effects.hpss(y)
            
            # Duration
            audio_duration = librosa.get_duration(y=y, sr=sr)
            
            # Create figure
            plt.figure(figsize=(20, 12), dpi=150)
            plt.style.use('dark_background')
            
            # Plot original audio
            plt.subplot(3, 1, 1)
            plt.title("Original Audio with Beats", fontsize=16, fontweight='bold')
            librosa.display.waveshow(y, sr=sr, alpha=0.8, color='#1DB954')
            
            # Add beat markers
            for time in beats:
                plt.axvline(x=time, color='red', alpha=0.5, linewidth=1.0)
                plt.plot(time, 0, 'ro', markersize=3, alpha=0.5)
            
            # Add downbeat markers with different color
            for time in downbeats:
                plt.axvline(x=time, color='yellow', alpha=0.7, linewidth=1.5)
                plt.plot(time, 0, 'yo', markersize=5)
            
            # Plot harmonic component
            plt.subplot(3, 1, 2)
            plt.title("Harmonic Component", fontsize=16, fontweight='bold')
            librosa.display.waveshow(y_harmonic, sr=sr, alpha=0.8, color='#2E77D0')
            
            # Plot percussive component
            plt.subplot(3, 1, 3)
            plt.title("Percussive Component", fontsize=16, fontweight='bold')
            librosa.display.waveshow(y_percussive, sr=sr, alpha=0.8, color='#E65C00')
            
            # Add beat markers to percussive component
            for time in beats:
                plt.axvline(x=time, color='red', alpha=0.5, linewidth=1.0)
                plt.plot(time, 0, 'ro', markersize=3, alpha=0.5)
            
            # Add downbeat markers with different color
            for time in downbeats:
                plt.axvline(x=time, color='yellow', alpha=0.7, linewidth=1.5)
                plt.plot(time, 0, 'yo', markersize=5)
            
            plt.xlabel("Time (seconds)", fontsize=14)
            plt.tight_layout()
            
            # Save or return the figure
            if output_path:
                plt.savefig(output_path, dpi=150, bbox_inches='tight')
                plt.close()
                
                # Convert to base64 for the frontend
                with open(output_path, 'rb') as img_file:
                    img_data = img_file.read()
                    img_base64 = base64.b64encode(img_data).decode('utf-8')
                return img_base64
            else:
                img_data = BytesIO()
                plt.savefig(img_data, format='png', dpi=150, bbox_inches='tight')
                img_data.seek(0)
                plt.close()
                # Convert to base64
                img_base64 = base64.b64encode(img_data.getvalue()).decode('utf-8')
                return img_base64
        except Exception as e:
            logger.error(f"Error creating waveform visualization: {e}")
            traceback.print_exc()
            return None
    
    def create_audio_with_clicks(self, audio_path, harmonic_path, percussive_path, beats, downbeats, output_dir=None):
        """
        Generate audio files with audible clicks at the detected beat positions
        
        Args:
            audio_path: Path to the original audio file
            harmonic_path: Path to the harmonic component audio
            percussive_path: Path to the percussive component audio
            beats: List of regular beat timestamps in seconds
            downbeats: List of downbeat timestamps in seconds
            output_dir: Directory to save the output files (defaults to the same directory as audio_path)
            
        Returns:
            Dictionary with paths to the generated audio files
        """
        logger.info(f"Generating audio with click tracks for {len(beats)} regular beats and {len(downbeats)} downbeats")
        
        if output_dir is None:
            output_dir = os.path.dirname(audio_path)
        
        # Create output paths
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        audio_with_clicks_path = os.path.join(output_dir, f"{base_name}_with_clicks.wav")
        harmonic_with_clicks_path = os.path.join(output_dir, f"{base_name}_harmonic_with_clicks.wav")
        percussive_with_clicks_path = os.path.join(output_dir, f"{base_name}_percussive_with_clicks.wav")
        clicks_only_path = os.path.join(output_dir, f"{base_name}_clicks_only.wav")
        
        try:
            # Load all audio files
            y_full, sr = librosa.load(audio_path, sr=None)
            y_harmonic, _ = librosa.load(harmonic_path, sr=None)
            y_percussive, _ = librosa.load(percussive_path, sr=None)
            
            # Create a clicks-only track using librosa.clicks
            # For regular beats (frequency 1000 Hz)
            regular_beats_clicks = librosa.clicks(
                times=beats, 
                sr=sr, 
                click_freq=1000, 
                length=len(y_full)
            )
            
            # For downbeats (frequency 1500 Hz)
            downbeats_clicks = librosa.clicks(
                times=downbeats, 
                sr=sr, 
                click_freq=1500, 
                length=len(y_full)
            )
            
            # Combine all clicks
            y_clicks_only = regular_beats_clicks + downbeats_clicks
            
            # Normalize clicks-only audio
            y_clicks_only = librosa.util.normalize(y_clicks_only) * 0.8
            
            # Normalize audio files to avoid excessive clipping when adding clicks
            y_full = librosa.util.normalize(y_full) * 0.7  
            y_harmonic = librosa.util.normalize(y_harmonic) * 0.7
            y_percussive = librosa.util.normalize(y_percussive) * 0.7
            
            # Add clicks to each audio track
            y_full_clicks = y_full + y_clicks_only
            y_harmonic_clicks = y_harmonic + y_clicks_only
            y_percussive_clicks = y_percussive + y_clicks_only
            
            # Normalize output to avoid clipping
            y_full_clicks = np.clip(y_full_clicks, -1.0, 1.0)
            y_harmonic_clicks = np.clip(y_harmonic_clicks, -1.0, 1.0)
            y_percussive_clicks = np.clip(y_percussive_clicks, -1.0, 1.0)
            
            # Write output files
            sf.write(audio_with_clicks_path, y_full_clicks, sr)
            sf.write(harmonic_with_clicks_path, y_harmonic_clicks, sr)
            sf.write(percussive_with_clicks_path, y_percussive_clicks, sr)
            sf.write(clicks_only_path, y_clicks_only, sr)
            
            logger.info(f"Successfully generated audio files with clicks")
            
            return {
                "audio_with_clicks": audio_with_clicks_path,
                "harmonic_with_clicks": harmonic_with_clicks_path,
                "percussive_with_clicks": percussive_with_clicks_path,
                "clicks_only": clicks_only_path
            }
            
        except Exception as e:
            logger.error(f"Error generating audio with clicks: {e}")
            logger.error(traceback.format_exc())
            return {
                "audio_with_clicks": None,
                "harmonic_with_clicks": None,
                "percussive_with_clicks": None,
                "clicks_only": None
            }
            
    def analyze_video(self, youtube_url_or_audio_path, progress_callback=None, use_audio_path=False):
        """
        Analyze a YouTube video or local audio file to detect beats
        
        Args:
            youtube_url_or_audio_path: Either a YouTube URL or local audio file path
            progress_callback: Optional callback for progress updates
            use_audio_path: If True, treat the input as a local audio file path
            
        Returns:
            Dictionary with analysis results
        """
        logger.info(f"Starting analysis for {'local audio file' if use_audio_path else 'YouTube URL'}")
        start_time = time.time()
        
        try:
            # Create temporary directory for processing
            temp_dir = tempfile.mkdtemp()
            logger.info(f"Created temporary directory: {temp_dir}")
            
            if progress_callback:
                progress_callback(10, "Preparing audio...")
            
            # Get audio file - either from local path or by downloading
            if use_audio_path:
                audio_file = youtube_url_or_audio_path
                logger.info(f"Using provided audio file: {audio_file}")
                if not os.path.exists(audio_file):
                    logger.error(f"Audio file not found: {audio_file}")
                    raise FileNotFoundError(f"Audio file not found: {audio_file}")
            else:
                # Download audio
                logger.info(f"Starting audio download from URL: {youtube_url_or_audio_path}")
                if progress_callback:
                    progress_callback(15, "Downloading audio from YouTube...")
                
                try:
                    # Use a timeout for audio download
                    # This approach works across platforms
                    timeout_seconds = 180  # 3 minutes timeout
                    
                    import threading
                    download_completed = False
                    download_exception = None
                    audio_file_result = [None]  # Use a list to store the result from the thread
                    
                    def download_thread():
                        nonlocal download_completed
                        try:
                            audio_file_result[0] = self.download_audio(youtube_url_or_audio_path, temp_dir)
                            download_completed = True
                        except Exception as e:
                            nonlocal download_exception
                            download_exception = e
                    
                    # Start download in a separate thread
                    thread = threading.Thread(target=download_thread)
                    thread.daemon = True  # Make sure thread doesn't block program exit
                    thread.start()
                    
                    # Wait for the download to complete or timeout
                    start_wait = time.time()
                    while not download_completed and time.time() - start_wait < timeout_seconds:
                        # Check if there was an exception
                        if download_exception:
                            raise download_exception
                        # Sleep a bit to avoid busy waiting
                        time.sleep(0.5)
                        # Update progress occasionally
                        if progress_callback and int(time.time()) % 5 == 0:
                            elapsed = time.time() - start_wait
                            progress_callback(15, f"Downloading audio... ({int(elapsed)}s elapsed)")
                    
                    # If download didn't complete in time
                    if not download_completed:
                        logger.error(f"Download timed out after {timeout_seconds} seconds")
                        if progress_callback:
                            progress_callback(15, f"Download timed out after {timeout_seconds} seconds")
                        raise TimeoutError(f"Audio download timed out after {timeout_seconds} seconds")
                    
                    # Get the result from the thread
                    audio_file = audio_file_result[0]
                    logger.info(f"Audio successfully downloaded to: {audio_file}")
                    
                except TimeoutError as te:
                    logger.error(f"Timeout while downloading audio: {str(te)}")
                    if progress_callback:
                        progress_callback(25, "Audio download timed out, please try again")
                    raise
                except Exception as e:
                    logger.error(f"Error downloading audio: {str(e)}")
                    logger.error(traceback.format_exc())
                    if progress_callback:
                        progress_callback(25, f"Error downloading audio: {str(e)}")
                    raise
                
                if progress_callback:
                    progress_callback(25, "Audio downloaded, preparing for processing...")
            
            # Get audio duration
            logger.info("Loading audio file to get duration...")
            if progress_callback:
                progress_callback(30, "Analyzing audio characteristics...")
            
            try:
                y, sr = librosa.load(audio_file, sr=None)
                duration = librosa.get_duration(y=y, sr=sr)
                logger.info(f"Audio duration: {duration:.2f} seconds, Sample rate: {sr}Hz")
            except Exception as e:
                logger.error(f"Error analyzing audio file: {str(e)}")
                logger.error(traceback.format_exc())
                if progress_callback:
                    progress_callback(30, f"Error analyzing audio: {str(e)}")
                raise
            
            # Separate audio
            logger.info("Starting audio component separation...")
            if progress_callback:
                progress_callback(40, "Separating audio components...")
            
            try:
                harmonic_file, percussive_file = self.separate_audio(audio_file, progress_callback)
                logger.info(f"Audio separated successfully into: \n- Harmonic: {harmonic_file} \n- Percussive: {percussive_file}")
            except Exception as e:
                logger.error(f"Error separating audio: {str(e)}")
                logger.error(traceback.format_exc())
                if progress_callback:
                    progress_callback(45, f"Error separating audio: {str(e)}")
                raise
            
            # Detect beats - using the ML-based method
            logger.info("Starting beat detection with ML model...")
            if progress_callback:
                progress_callback(55, "Detecting beats using ML model...")
            
            try:
                beats, downbeats, tempo = self.detect_beats(harmonic_file, percussive_file, audio_file)
                logger.info(f"Beat detection completed. Found {len(beats)} regular beats and {len(downbeats)} downbeats")
                if progress_callback:
                    progress_callback(70, f"Found {len(beats)} beats, tempo: {tempo:.1f} BPM")
            except Exception as e:
                logger.error(f"Error detecting beats: {str(e)}")
                logger.error(traceback.format_exc())
                if progress_callback:
                    progress_callback(60, f"Error detecting beats: {str(e)}")
                raise
            
            # Create visualization
            logger.info("Creating waveform visualization...")
            if progress_callback:
                progress_callback(75, "Generating waveform visualization...")
            
            try:
                waveform_path = os.path.join(temp_dir, "waveform.png")
                waveform_base64 = self.create_waveform_visualization(audio_file, beats, downbeats, waveform_path)
                logger.info("Waveform visualization created successfully")
                if progress_callback:
                    progress_callback(80, "Waveform visualization complete")
            except Exception as e:
                logger.error(f"Error creating waveform visualization: {str(e)}")
                logger.error(traceback.format_exc())
                # Continue with processing even if visualization fails
                waveform_base64 = ""
                if progress_callback:
                    progress_callback(80, "Waveform visualization failed, continuing with processing")
            
            # Create audio with clicks
            logger.info("Generating audio tracks with beats marked by clicks...")
            if progress_callback:
                progress_callback(85, "Adding click track to audio...")
            
            try:
                audio_files = self.create_audio_with_clicks(audio_file, harmonic_file, percussive_file, beats, downbeats, temp_dir)
                logger.info("Audio with clicks generated successfully")
            except Exception as e:
                logger.error(f"Error generating audio with clicks: {str(e)}")
                logger.error(traceback.format_exc())
                # Create a default audio_files dict with None values
                audio_files = {
                    "audio_with_clicks": None,
                    "harmonic_with_clicks": None,
                    "percussive_with_clicks": None,
                    "clicks_only": None
                }
                if progress_callback:
                    progress_callback(85, "Error generating audio with clicks, continuing with partial results")
            
            # Final completion
            if progress_callback:
                progress_callback(95, "Finalizing results...")
            
            # Return results
            total_time = time.time() - start_time
            logger.info(f"Analysis completed in {total_time:.2f} seconds")
            logger.info(f"Generated {len(audio_files)} output audio files")
            
            # Detailed output paths logging
            logger.info("Output files:")
            for key, path in audio_files.items():
                if path:
                    logger.info(f"- {key}: {path}")
                    
            if progress_callback:
                progress_callback(100, "Analysis complete")
            
            return {
                "duration": duration,
                "tempo": float(tempo),
                "beats": beats.tolist(),
                "downbeats": downbeats.tolist() if len(downbeats) > 0 else [],
                "waveform_image": waveform_base64,
                "harmonic_path": harmonic_file,
                "percussive_path": percussive_file,
                "audio_with_clicks": audio_files["audio_with_clicks"],
                "harmonic_with_clicks": audio_files["harmonic_with_clicks"],
                "percussive_with_clicks": audio_files["percussive_with_clicks"],
                "clicks_only": audio_files["clicks_only"]
            }
            
        except Exception as e:
            logger.error(f"Error analyzing video: {str(e)}")
            logger.error(traceback.format_exc())
            if progress_callback:
                progress_callback(100, f"Error: {str(e)}")
            raise

# Simple test if run directly
if __name__ == "__main__":
    detector = BeatDetector()
    results = detector.analyze_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    print(f"Duration: {results['duration']:.2f} seconds")
    print(f"Number of beats: {len(results['beats'])}")
    print(f"Number of downbeats: {len(results['downbeats'])}")
    print(f"Tempo: {results['tempo']:.1f} BPM") 