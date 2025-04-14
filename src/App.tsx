import React, { useState, useRef, useEffect } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import styled, { createGlobalStyle } from 'styled-components';
import TimelineEditor from './components/TimelineEditor';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import { API_URL, getApiPath } from './config';

type TimeoutRef = ReturnType<typeof setTimeout>;

const GlobalStyle = createGlobalStyle`
  body {
    background: linear-gradient(to bottom, #1a1a1a, #121212);
    color: #ffffff;
    min-height: 100vh;
  }
`;

interface Step {
  start: number;
  end: number;
  description: string;
}

// Add a new interface for progress data
interface ProgressData {
  progress: number;
  status_message: string;
}

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: 'Circular', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
`;

const Title = styled.h1`
  color: #ffffff;
  text-align: center;
  margin-bottom: 40px;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const MainContent = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const VideoContainer = styled.div`
  margin-bottom: 30px;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  position: relative;
  padding-top: 56.25%; /* 16:9 Aspect Ratio */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  width: 100%;
  
  & > div {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`;

const StyledYouTube = styled(YouTube)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
`;

const TimelineContainer = styled.div`
  position: relative;
  margin: 30px 0;
  padding: 0 40px;
`;

const Timeline = styled.div`
  width: 100%;
  height: 60px;
  background: rgba(255, 255, 255, 0.05);
  position: relative;
  border-radius: 8px;
  padding: 5px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const StepSegment = styled.div<{ isActive: boolean }>`
  min-width: calc(20% - 4px);
  height: 40px;
  background: ${props => props.isActive 
    ? 'linear-gradient(135deg, #1DB954, #1ed760)' 
    : 'linear-gradient(135deg, #535353, #404040)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 4px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, ${props => props.isActive ? '0.2' : '0.1'});
  padding: 0 8px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    transform: translateY(-1px) scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    background: ${props => props.isActive 
      ? 'linear-gradient(135deg, #1DB954, #1ed760)' 
      : 'linear-gradient(135deg, #606060, #505050)'};
    z-index: 1;
  }

  &::after {
    content: attr(data-time);
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    opacity: 0;
    transition: opacity 0.2s;
    white-space: nowrap;
  }

  &:hover::after {
    opacity: 1;
  }
`;

const ScrollButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => props.direction === 'left' ? 'left: 0;' : 'right: 0;'}
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  z-index: 2;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-50%) scale(1.1);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    &:hover {
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
`;

const Button = styled.button<{ isActive?: boolean; variant?: 'primary' | 'secondary' }>`
  padding: 14px 28px;
  background: ${props => {
    if (props.variant === 'primary') return props.isActive ? '#1DB954' : '#1ed760';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: ${props => {
      if (props.variant === 'primary') return props.isActive ? '#1DB954' : '#1ed760';
      return 'rgba(255, 255, 255, 0.15)';
    }};
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.05);
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 24px;
  backdrop-filter: blur(8px);
  z-index: 1000;
`;

const Spinner = styled.div`
  margin-top: 20px;
  width: 40px;
  height: 40px;
  border: 4px solid #1DB954;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ProgressContainer = styled.div`
  width: 80%;
  max-width: 500px;
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 10px;
`;

const ProgressFill = styled.div<{ progress: number }>`
  height: 100%;
  width: ${props => props.progress}%;
  background: linear-gradient(to right, #1DB954, #1ed760);
  border-radius: 5px;
  transition: width 0.5s ease-out;
`;

const ProgressStatus = styled.div`
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 10px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  color: #ff5555;
  background: rgba(255, 85, 85, 0.1);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid rgba(255, 85, 85, 0.2);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
`;

const StepInfo = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  letter-spacing: 0.5px;
  margin: 10px 0;

  span {
    color: #1DB954;
    margin: 0 5px;
  }
`;

const WelcomeScreen = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AudioVisualizationSection = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  h3 {
    color: #1DB954;
    margin-bottom: 20px;
    font-size: 1.4rem;
    text-align: center;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`;

const WaveformContainer = styled.div`
  width: 100%;
  margin-bottom: 20px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 10px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &::-webkit-scrollbar {
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 5px;
    margin: 0 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(29, 185, 84, 0.5);
    border-radius: 5px;
    border: 2px solid rgba(0, 0, 0, 0.2);
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #1DB954;
  }
`;

const WaveformImage = styled.img`
  min-width: 100%;
  width: 100%;
  height: auto;
  border-radius: 4px;
  margin-bottom: 5px;
  object-fit: contain;
  max-height: 600px;
  display: block;
`;

const AudioPlayer = styled.audio`
  width: 100%;
  height: 40px;
  margin-bottom: 20px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  
  &::-webkit-media-controls-panel {
    background-color: rgba(29, 185, 84, 0.1);
  }
  
  &::-webkit-media-controls-play-button {
    background-color: rgba(29, 185, 84, 0.3);
    border-radius: 50%;
  }
`;

const AudioLabel = styled.div`
  font-size: 1rem;
  margin-bottom: 10px;
  margin-top: 20px;
  color: #1DB954;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  
  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const FallbackNotice = styled.div`
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
  text-align: center;
  color: #FFD700;
  font-size: 0.9rem;
`;

// Update the SpeedControlContainer to be collapsible
const SpeedControlContainer = styled.div<{ isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 15px 0;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 15px;
  border-radius: 12px;
  flex-wrap: wrap;
  transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
  overflow: hidden;
  max-height: ${props => props.isExpanded ? '200px' : '50px'};
  opacity: ${props => props.isExpanded ? '1' : '0.9'};
`;

const SpeedControlToggle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  user-select: none;
  
  &:hover {
    .speed-value {
      color: #1DB954;
    }
  }
`;

const SpeedControlsContent = styled.div<{ isExpanded: boolean }>`
  display: ${props => props.isExpanded ? 'flex' : 'none'};
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
  align-items: center;
`;

const SpeedToggleButton = styled.div`
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  font-size: 0.9rem;
  
  svg {
    transition: transform 0.3s ease;
  }
`;

const SpeedCurrentValue = styled.div`
  color: #1DB954;
  font-weight: bold;
  font-size: 0.9rem;
`;

const SpeedLabel = styled.span`
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 80px;
`;

const SpeedButton = styled.button<{ active: boolean }>`
  padding: 6px 12px;
  background: ${props => props.active ? '#1DB954' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#1ed760' : 'rgba(255, 255, 255, 0.2)'};
    transform: scale(1.05);
  }
`;

const SpeedSliderContainer = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  gap: 10px;
`;

const SpeedSlider = styled.input`
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #1DB954;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.2);
    }
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #1DB954;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    
    &:hover {
      transform: scale(1.2);
    }
  }
`;

const SpeedDisplay = styled.div`
  color: #1DB954;
  font-size: 0.9rem;
  font-weight: bold;
  min-width: 60px;
  text-align: center;
`;

// Add local storage utilities at the top of the file
const saveToLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

// Add version info from package.json
const appVersion = import.meta.env.VITE_APP_VERSION || '0.1.0';
const isDevelopment = import.meta.env.DEV;

function App() {
  // Initialize state from localStorage when available
  const [videoId, setVideoId] = useState<string>(loadFromLocalStorage('videoId', ''));
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(loadFromLocalStorage('currentStep', 0));
  const [isLooping, setIsLooping] = useState<boolean>(loadFromLocalStorage('isLooping', true));
  const [steps, setSteps] = useState<Step[]>(loadFromLocalStorage('steps', []));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioWithClicksUrl, setAudioWithClicksUrl] = useState<string>(loadFromLocalStorage('audioWithClicksUrl', ''));
  const [harmonicWithClicksUrl, setHarmonicWithClicksUrl] = useState<string>(loadFromLocalStorage('harmonicWithClicksUrl', ''));
  const [percussiveWithClicksUrl, setPercussiveWithClicksUrl] = useState<string>(loadFromLocalStorage('percussiveWithClicksUrl', ''));
  const [harmonicOriginalUrl, setHarmonicOriginalUrl] = useState<string>(loadFromLocalStorage('harmonicOriginalUrl', ''));
  const [percussiveOriginalUrl, setPercussiveOriginalUrl] = useState<string>(loadFromLocalStorage('percussiveOriginalUrl', ''));
  const [clicksOnlyUrl, setClicksOnlyUrl] = useState<string>(loadFromLocalStorage('clicksOnlyUrl', ''));
  const [waveformImage, setWaveformImage] = useState<string>(loadFromLocalStorage('waveformImage', ''));
  const [isDummyData, setIsDummyData] = useState<boolean>(loadFromLocalStorage('isDummyData', false));
  // Add state for beats and downbeats
  const [beats, setBeats] = useState<number[]>(loadFromLocalStorage('beats', []));
  const [downbeats, setDownbeats] = useState<number[]>(loadFromLocalStorage('downbeats', []));
  const [videoDuration, setVideoDuration] = useState<number>(loadFromLocalStorage('videoDuration', 0));
  // Progress tracking
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isPollingProgress, setIsPollingProgress] = useState<boolean>(false);
  const pollingIntervalRef = useRef<TimeoutRef | null>(null);
  
  const checkTimeInterval = useRef<TimeoutRef | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>(loadFromLocalStorage('videoUrl', ''));
  const [playbackRate, setPlaybackRate] = useState<number>(loadFromLocalStorage('playbackRate', 1));
  const [isSpeedControlExpanded, setIsSpeedControlExpanded] = useState<boolean>(false);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (videoId) saveToLocalStorage('videoId', videoId);
    if (currentStep !== undefined) saveToLocalStorage('currentStep', currentStep);
    if (isLooping !== undefined) saveToLocalStorage('isLooping', isLooping);
    if (steps.length > 0) saveToLocalStorage('steps', steps);
    if (audioWithClicksUrl) saveToLocalStorage('audioWithClicksUrl', audioWithClicksUrl);
    if (harmonicWithClicksUrl) saveToLocalStorage('harmonicWithClicksUrl', harmonicWithClicksUrl);
    if (percussiveWithClicksUrl) saveToLocalStorage('percussiveWithClicksUrl', percussiveWithClicksUrl);
    if (harmonicOriginalUrl) saveToLocalStorage('harmonicOriginalUrl', harmonicOriginalUrl);
    if (percussiveOriginalUrl) saveToLocalStorage('percussiveOriginalUrl', percussiveOriginalUrl);
    if (clicksOnlyUrl) saveToLocalStorage('clicksOnlyUrl', clicksOnlyUrl);
    if (waveformImage) saveToLocalStorage('waveformImage', waveformImage);
    saveToLocalStorage('isDummyData', isDummyData);
    if (beats.length > 0) saveToLocalStorage('beats', beats);
    if (downbeats.length > 0) saveToLocalStorage('downbeats', downbeats);
    if (videoDuration > 0) saveToLocalStorage('videoDuration', videoDuration);
    if (videoUrl) saveToLocalStorage('videoUrl', videoUrl);
    if (playbackRate !== 1) saveToLocalStorage('playbackRate', playbackRate);
  }, [
    videoId, currentStep, isLooping, steps, 
    audioWithClicksUrl, harmonicWithClicksUrl, percussiveWithClicksUrl,
    harmonicOriginalUrl, percussiveOriginalUrl, clicksOnlyUrl,
    waveformImage, isDummyData, beats, downbeats, videoDuration,
    videoUrl, playbackRate
  ]);

  // Effect to automatically load saved state when the page loads
  useEffect(() => {
    // If we have a saved videoId but no analysis results yet, try to load them
    if (videoId && !isLoading && steps.length === 0 && beats.length === 0) {
      console.log('Attempting to restore analysis results for video:', videoId);
      fetchProgress(videoId);
    }
  }, [videoId]);

  const handleVideoReady = (player: YouTubePlayer | HTMLVideoElement) => {
    // Handle both YouTube player and custom video player
    if ('getCurrentTime' in player) {
      // It's YouTube player
      setPlayer(player as YouTubePlayer);
    } else {
      // It's HTML video element - setup our own player object
      const videoElement = player as HTMLVideoElement;
      const customPlayer: YouTubePlayer = {
        getCurrentTime: () => videoElement.currentTime,
        getDuration: () => videoElement.duration,
        getVideoLoadedFraction: () => 1, // Always return 1 for simplicity
        getPlayerState: () => videoElement.paused ? 2 : 1, // 1 is playing, 2 is paused
        playVideo: () => { videoElement.play(); },
        pauseVideo: () => { videoElement.pause(); },
        stopVideo: () => { videoElement.pause(); videoElement.currentTime = 0; },
        seekTo: (seconds: number, allowSeekAhead?: boolean) => { videoElement.currentTime = seconds; }
      };
      setPlayer(customPlayer);
    }
  };

  const handleStepClick = (index: number) => {
    if (player) {
      setCurrentStep(index);
      player.seekTo(steps[index].start, true);
      player.playVideo();
      setIsPlaying(true);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      handleStepClick(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      handleStepClick(currentStep - 1);
    }
  };

  // Function to fetch progress updates
  const fetchProgress = async (videoIdToCheck: string) => {
    try {
      console.log(`PROGRESS POLL: Fetching progress for video ID: ${videoIdToCheck}`);
      const response = await fetch(getApiPath(`/api/progress/${videoIdToCheck}`));
      console.log(`PROGRESS POLL: Response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('PROGRESS POLL: Progress response data:', data);
        
        // Check if we got complete data (not just progress)
        if (data.videoId && !('progress' in data)) {
          console.log('PROGRESS POLL: Analysis complete, received full data');
          
          // Process the complete data
          if (data.steps && Array.isArray(data.steps)) {
            setSteps(data.steps);
          }
          
          // Store beats and downbeats
          if (data.beats && Array.isArray(data.beats)) {
            setBeats(data.beats);
          }
          
          if (data.downbeats && Array.isArray(data.downbeats)) {
            setDownbeats(data.downbeats);
          }
          
          if (data.duration) {
            setVideoDuration(data.duration);
          }
          
          // Set video URL if available
          if (data.video_url) {
            setVideoUrl(`${API_URL}${data.video_url}`);
          }
          
          setAudioWithClicksUrl(data.audio_with_clicks_url ? `${API_URL}${data.audio_with_clicks_url}` : '');
          setHarmonicWithClicksUrl(data.harmonic_audio_url ? `${API_URL}${data.harmonic_audio_url}` : '');
          setPercussiveWithClicksUrl(data.percussive_audio_url ? `${API_URL}${data.percussive_audio_url}` : '');
          setHarmonicOriginalUrl(data.harmonic_original_url ? `${API_URL}${data.harmonic_original_url}` : '');
          setPercussiveOriginalUrl(data.percussive_original_url ? `${API_URL}${data.percussive_original_url}` : '');
          setClicksOnlyUrl(data.clicks_only_url ? `${API_URL}${data.clicks_only_url}` : '');
          
          // Handle waveform image
          if (data.waveform_image) {
            if (data.waveform_image.startsWith('data:image')) {
              setWaveformImage(data.waveform_image);
            } else {
              setWaveformImage(`data:image/png;base64,${data.waveform_image}`);
            }
          }
          
          setCurrentStep(0);
          setIsDummyData(!!data.is_dummy_data);
          
          // Set progress to 100% and stop polling
          setProgress(100);
          setStatusMessage('Analysis complete');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Otherwise it's just a progress update
        const progressData = data as ProgressData;
        console.log(`PROGRESS POLL: Progress update: ${progressData.progress}% - ${progressData.status_message}`);
        
        // Update UI with progress
        setProgress(progressData.progress);
        setStatusMessage(progressData.status_message);
        
        // Update document title with progress
        document.title = `${progressData.progress}% - Dance Beat Analyzer`;
        
        // If the progress is 100 or there was an error, stop polling
        if (progressData.progress >= 100 || progressData.status_message.includes('Error')) {
          console.log('PROGRESS POLL: Stopping polling - process complete or error occurred');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
        }
      } else {
        console.warn(`PROGRESS POLL: Failed to fetch progress: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('PROGRESS POLL: Error fetching progress:', error);
    }
  };

  // Start polling for progress once we have a videoId
  useEffect(() => {
    if (isPollingProgress && videoId) {
      console.log(`POLLING EFFECT: Starting polling for video ID: ${videoId}`);
      
      // Initial fetch
      fetchProgress(videoId);
      
      // Set up polling interval - check every 1 second
      console.log(`POLLING EFFECT: Setting up interval for ${videoId}`);
      pollingIntervalRef.current = setInterval(() => {
        console.log(`POLLING EFFECT: Interval triggered for ${videoId}`);
        fetchProgress(videoId);
      }, 1000) as unknown as TimeoutRef;
      
      // Clean up on unmount or when polling stops
      return () => {
        console.log(`POLLING EFFECT: Cleaning up interval for ${videoId}`);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else if (!isPollingProgress && pollingIntervalRef.current) {
      console.log(`POLLING EFFECT: Polling disabled - cleaning up interval`);
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [isPollingProgress, videoId]);

  useEffect(() => {
    if (player && steps.length > 0) {
      if (checkTimeInterval.current) {
        clearInterval(checkTimeInterval.current);
      }

      checkTimeInterval.current = setInterval(() => {
        const currentTime = player.getCurrentTime();
        const currentStepData = steps[currentStep];

        if (currentTime >= currentStepData.end) {
          if (isLooping) {
            player.seekTo(currentStepData.start, true);
          } else if (currentStep < steps.length - 1) {
            handleNextStep();
          }
        }
      }, 100) as unknown as TimeoutRef;

      return () => {
        if (checkTimeInterval.current) {
          clearInterval(checkTimeInterval.current);
        }
      };
    }
  }, [player, currentStep, isLooping, steps]);

  const analyzeVideo = async (url: string) => {
    try {
      setIsLoading(true);
      setError('');
      setIsDummyData(false);
      setProgress(0);
      setStatusMessage('Starting analysis...');
      
      // Extract video ID from URL before making the API call
      const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const extractedVideoId = videoIdMatch ? videoIdMatch[1] : '';
      
      console.log(`ANALYSIS: Extracted video ID: ${extractedVideoId}`);
      
      // Set video ID right away for immediate display
      if (extractedVideoId) {
        setVideoId(extractedVideoId);
      } else {
        console.warn('ANALYSIS: Failed to extract video ID from URL');
      }
      
      console.log(`ANALYSIS: Sending request to analyze video: ${url}`);
      const response = await fetch(getApiPath('/api/analyze-video'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze video');
      }

      const data = await response.json();
      console.log('ANALYSIS: Initial response from analyze-video:', data);
      
      // Start polling for progress updates
      const returnedVideoId = data.videoId;
      console.log(`ANALYSIS: Using video ID for polling: ${returnedVideoId}`);
      
      // Set the videoId from the response (in case extraction failed)
      setVideoId(returnedVideoId);
      
      // Start polling immediately
      console.log(`ANALYSIS: Starting progress polling for video ID: ${returnedVideoId}`);
      setIsPollingProgress(true);
      
      // Do an immediate progress check
      fetchProgress(returnedVideoId);
      
    } catch (error) {
      console.error('ANALYSIS: Error analyzing video:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze video');
      setIsLoading(false);
      setIsPollingProgress(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
  };

  const handleVideoInput = async () => {
    const url = prompt('Enter YouTube video URL:\nPlease use a direct video URL (not a playlist)\nExample: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (url) {
      if (!url.match(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
        setError('Invalid YouTube URL format. Please provide a valid YouTube video URL.');
        return;
      }
      await analyzeVideo(url);
    }
  };

  const totalDuration = steps[steps.length - 1]?.end || 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (!timelineRef.current) return;
    
    const scrollAmount = direction === 'left' ? -200 : 200;
    timelineRef.current.scrollLeft += scrollAmount;
  };

  const scrollToCurrentStep = () => {
    if (timelineRef.current) {
      const stepElements = timelineRef.current.children;
      if (stepElements[currentStep]) {
        const stepElement = stepElements[currentStep] as HTMLElement;
        const timelineWidth = timelineRef.current.clientWidth;
        const scrollPosition = stepElement.offsetLeft - (timelineWidth / 2) + (stepElement.clientWidth / 2);
        timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    scrollToCurrentStep();
  }, [currentStep]);

  const ytOptions = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      fs: 1,
    },
  };

  // Handle steps generated from TimelineEditor
  const handleStepsGenerated = (newSteps: Step[]) => {
    setSteps(newSteps);
    setCurrentStep(0);
    
    // If player exists, seek to the first step
    if (player && newSteps.length > 0) {
      player.seekTo(newSteps[0].start, true);
    }
  };

  // Add a function to periodically update the current playback time
  useEffect(() => {
    if (player && videoId) {
      const updatePlaybackTime = () => {
        try {
          const time = player.getCurrentTime();
          setCurrentPlaybackTime(time);
        } catch (e) {
          console.error('Error getting current time:', e);
        }
      };
      
      // Update every 100ms to make the playhead movement smooth
      const timeUpdateInterval = setInterval(updatePlaybackTime, 100);
      
      return () => {
        clearInterval(timeUpdateInterval);
      };
    }
  }, [player, videoId]);

  const handleVideoAnalysis = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Starting video analysis...');
    
    try {
      // Step 1: Download audio
      setStatusMessage('Downloading audio...');
      setProgress(10);
      const response = await fetch(getApiPath(`/api/download_audio?video_id=${videoId}`));
      const { audio_path } = await response.json();
      
      // Step 2: Separate audio
      setStatusMessage('Separating audio...');
      setProgress(30);
      const separateResponse = await fetch(getApiPath(`/api/separate_audio?audio_path=${audio_path}`));
      const { vocals_path, drums_path } = await separateResponse.json();
      
      // Step 3: Detect beats and downbeats
      setStatusMessage('Detecting beats and downbeats...');
      setProgress(50);
      const beatsResponse = await fetch(getApiPath(`/api/detect_beats?audio_path=${vocals_path}`));
      const { beats, downbeats } = await beatsResponse.json();
      
      // Step 4: Generate dance steps
      setStatusMessage('Generating dance steps...');
      setProgress(90);
      const stepsResponse = await fetch(getApiPath('/api/generate_steps'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beats, downbeats }),
      });
      const { steps } = await stepsResponse.json();
      
      setSteps(steps);
      setBeats(beats);
      setDownbeats(downbeats);
      setVideoDuration(totalDuration);
      setAudioWithClicksUrl(clicksOnlyUrl);
      setHarmonicWithClicksUrl(harmonicWithClicksUrl);
      setPercussiveWithClicksUrl(percussiveWithClicksUrl);
      setHarmonicOriginalUrl(harmonicOriginalUrl);
      setPercussiveOriginalUrl(percussiveOriginalUrl);
      setClicksOnlyUrl(clicksOnlyUrl);
      setWaveformImage(waveformImage);
      setIsDummyData(false);
      
      setProgress(100);
      setStatusMessage('Analysis complete!');
    } catch (error) {
      console.error('Error during analysis:', error);
      setStatusMessage('Error during analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle video state change for our custom player
  const handleCustomPlayerStateChange = (isPlaying: boolean) => {
    setIsPlaying(isPlaying);
  };

  // Add a function to handle time updates from our custom player
  const handleTimeUpdate = (currentTime: number) => {
    // This function can be used for any time-based updates needed
    // For now, it's implemented but not used for anything specific
  };

  // Add a function to handle playback rate changes:
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  // Toggle speed control expanded state
  const toggleSpeedControl = () => {
    setIsSpeedControlExpanded(!isSpeedControlExpanded);
  };

  // Update the reset/new video button to clear localStorage
  const handleNewVideo = () => {
    // Clear relevant localStorage items
    [
      'videoId', 'currentStep', 'steps', 'audioWithClicksUrl', 
      'harmonicWithClicksUrl', 'percussiveWithClicksUrl', 'harmonicOriginalUrl', 
      'percussiveOriginalUrl', 'clicksOnlyUrl', 'waveformImage', 
      'isDummyData', 'beats', 'downbeats', 'videoDuration', 'videoUrl'
    ].forEach(key => localStorage.removeItem(key));
    
    // Reset state
    setVideoId('');
    setSteps([]);
    setAudioWithClicksUrl('');
    setHarmonicWithClicksUrl('');
    setPercussiveWithClicksUrl('');
    setHarmonicOriginalUrl('');
    setPercussiveOriginalUrl('');
    setClicksOnlyUrl('');
    setWaveformImage('');
    setIsDummyData(false);
    setBeats([]);
    setDownbeats([]);
    setVideoDuration(0);
    setVideoUrl('');
    setCurrentStep(0);
  };

  const EnvironmentBadge = styled.div`
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: ${props => props.color || 'rgba(0, 0, 0, 0.5)'};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    z-index: 1000;
    opacity: 0.7;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
    }
  `;

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>Dance Beat Analyzer</Title>
        
        {isLoading && (
          <LoadingOverlay>
            <div style={{ textAlign: 'center', maxWidth: '600px' }}>
              <h2>Analyzing video...</h2>
              <p>Current progress: {progress}%</p>
              <ProgressContainer>
                <ProgressBar>
                  <ProgressFill progress={progress} />
                </ProgressBar>
                <Spinner style={{ marginTop: '20px' }} />
                {statusMessage && (
                  <ProgressStatus>
                    <strong>Status:</strong> {statusMessage}
                  </ProgressStatus>
                )}
              </ProgressContainer>
              <p style={{ fontSize: '14px', marginTop: '20px', color: '#AAA' }}>
                This may take a few minutes. The app is downloading audio, separating it into components, and detecting beats.
              </p>
            </div>
          </LoadingOverlay>
        )}
        
        {error && (
          <ErrorMessage>
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => setError('')}>Dismiss</button>
          </ErrorMessage>
        )}
        
        <MainContent>
          {!videoId && !isLoading && (
            <WelcomeScreen>
              <h2>Welcome to Dance Beat Analyzer</h2>
              <p>
                Paste a YouTube URL to analyze the dance beats and create synchronized step instructions.
                <br />
                We'll extract the audio, detect the beats, and give you a timeline of dance moves synced to the music.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Paste YouTube URL here"
                  style={{
                    padding: '15px 20px',
                    width: '50%',
                    borderRadius: '50px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    fontSize: '1rem',
                  }}
                  id="video-url"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = document.getElementById('video-url') as HTMLInputElement;
                      if (input && input.value) {
                        analyzeVideo(input.value);
                      }
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    const input = document.getElementById('video-url') as HTMLInputElement;
                    if (input && input.value) {
                      analyzeVideo(input.value);
                    }
                  }}
                >
                  Analyze
                </Button>
              </div>
            </WelcomeScreen>
          )}
          
          {videoId && !isLoading && (
            <>
              {isDummyData && (
                <FallbackNotice>
                  <strong>Using Demo Data</strong>
                  We encountered an issue with analyzing this video, so we're showing you sample data instead.
                </FallbackNotice>
              )}
              
              <VideoContainer>
                <CustomVideoPlayer 
                  videoId={videoId}
                  videoUrl={videoUrl}
                  onReady={handleVideoReady}
                  onStateChange={handleCustomPlayerStateChange}
                  onTimeUpdate={handleTimeUpdate}
                  currentStep={currentStep}
                  steps={steps}
                  onPrevStep={handlePrevStep}
                  onNextStep={handleNextStep}
                  playbackRate={playbackRate}
                />
              </VideoContainer>
              
              {/* Updated collapsible Speed Control Component */}
              <SpeedControlContainer isExpanded={isSpeedControlExpanded}>
                <SpeedControlToggle onClick={toggleSpeedControl}>
                  <SpeedToggleButton>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: isSpeedControlExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Playback Speed
                  </SpeedToggleButton>
                  <SpeedCurrentValue className="speed-value">{playbackRate.toFixed(2)}x</SpeedCurrentValue>
                </SpeedControlToggle>
                
                <SpeedControlsContent isExpanded={isSpeedControlExpanded}>
                  <SpeedButton 
                    active={playbackRate === 0.25} 
                    onClick={() => handlePlaybackRateChange(0.25)}
                  >
                    0.25x
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 0.5} 
                    onClick={() => handlePlaybackRateChange(0.5)}
                  >
                    0.5x
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 0.75} 
                    onClick={() => handlePlaybackRateChange(0.75)}
                  >
                    0.75x
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 1} 
                    onClick={() => handlePlaybackRateChange(1)}
                  >
                    Normal
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 1.25} 
                    onClick={() => handlePlaybackRateChange(1.25)}
                  >
                    1.25x
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 1.5} 
                    onClick={() => handlePlaybackRateChange(1.5)}
                  >
                    1.5x
                  </SpeedButton>
                  <SpeedButton 
                    active={playbackRate === 2} 
                    onClick={() => handlePlaybackRateChange(2)}
                  >
                    2.0x
                  </SpeedButton>
                  
                  <SpeedSliderContainer>
                    <SpeedSlider 
                      type="range" 
                      min="0.25" 
                      max="2" 
                      step="0.05" 
                      value={playbackRate} 
                      onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))} 
                    />
                    <SpeedDisplay>{playbackRate.toFixed(2)}x</SpeedDisplay>
                  </SpeedSliderContainer>
                </SpeedControlsContent>
              </SpeedControlContainer>
              
              {steps.length > 0 && (
                <>
                  <StepInfo>
                    Currently learning <span>{steps[currentStep].description}</span> from <span>{steps[currentStep].start.toFixed(1)}s</span> to <span>{steps[currentStep].end.toFixed(1)}s</span>
                  </StepInfo>
                  
                  <TimelineContainer>
                    <ScrollButton 
                      direction="left" 
                      onClick={() => scrollTimeline('left')}
                    >
                      ◀
                    </ScrollButton>
                    <Timeline ref={timelineRef}>
                      {steps.map((step, index) => (
                        <StepSegment
                          key={index}
                          isActive={index === currentStep}
                          onClick={() => handleStepClick(index)}
                          title={`${step.description} (${step.start.toFixed(1)}s - ${step.end.toFixed(1)}s)`}
                          data-time={`${step.start.toFixed(1)}s - ${step.end.toFixed(1)}s`}
                        >
                          {step.description}
                        </StepSegment>
                      ))}
                    </Timeline>
                    <ScrollButton 
                      direction="right" 
                      onClick={() => scrollTimeline('right')}
                    >
                      ▶
                    </ScrollButton>
                  </TimelineContainer>
                </>
              )}
              
              {/* Add the TimelineEditor component */}
              {beats.length > 0 && videoDuration > 0 && (
                <TimelineEditor
                  videoId={videoId}
                  duration={videoDuration}
                  beats={beats}
                  downbeats={downbeats}
                  onStepsGenerated={handleStepsGenerated}
                  currentTime={player ? player.getCurrentTime() : 0}
                />
              )}
              
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Button onClick={handleNewVideo}>
                  Analyze Another Video
                </Button>
              </div>
            </>
          )}
        </MainContent>
      </Container>
      
      {/* Environment badge to help identify which environment is being used */}
      <EnvironmentBadge color={isDevelopment ? '#2196F3' : '#4CAF50'}>
        {isDevelopment ? 'DEV' : 'PROD'} | v{appVersion} | {API_URL.includes('localhost') ? 'Local API' : 'Remote API'}
      </EnvironmentBadge>
    </>
  );
}

export default App; 