/**
 * Dance Beat Analyzer - Main Application
 * This application analyzes YouTube videos to detect beats and create dance steps
 * synchronized with the music.
 */

import React, { useState, useRef, useEffect } from 'react';
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube';
import styled, { createGlobalStyle } from 'styled-components';
import TimelineEditor from './components/TimelineEditor';
import CustomVideoPlayer from './components/CustomVideoPlayer';
import { API_URL, getApiPath } from './config';

// Type definitions
type TimeoutRef = ReturnType<typeof setTimeout>;

/**
 * Step interface - represents a single dance step with timing and description
 */
interface Step {
  start: number;   // Start time in seconds
  end: number;     // End time in seconds
  description: string;  // Description of the dance step
}

/**
 * ProgressData interface - represents progress updates during analysis
 */
interface ProgressData {
  progress: number;       // Progress percentage (0-100)
  status_message: string; // Current status message
}

// Utility functions for localStorage persistence
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

// Get version info from environment variables
const appVersion = import.meta.env.VITE_APP_VERSION || '0.1.0';
const isDevelopment = import.meta.env.DEV;

// Global styles
const GlobalStyle = createGlobalStyle`
  body {
    background: linear-gradient(to bottom, #1a1a1a, #121212);
    color: #ffffff;
    min-height: 100vh;
  }
`;

/**
 * Styled Components
 * -----------------
 * Layout Components
 */
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

/**
 * Video Player Components
 */
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

/**
 * Timeline and Steps Components
 */
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

// Individual step segment in the timeline
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

// Timeline scroll buttons
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

/**
 * Controls Components
 */
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

/**
 * Loading and Progress Components
 */
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

/**
 * Progress Indicator Components
 */
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

/**
 * Message Components
 */
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

/**
 * Audio Visualization Components
 */
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

/**
 * Audio Player Components
 */
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

/**
 * Playback Speed Control Components
 */
// Collapsible container for speed controls
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

// Environment indicator
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

/**
 * Main App Component
 * -----------------
 * Handles the application state and logic
 */
function App() {
  // State initialized from localStorage when available
  const [videoId, setVideoId] = useState<string>(loadFromLocalStorage('videoId', ''));
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(loadFromLocalStorage('currentStep', 0));
  const [isLooping, setIsLooping] = useState<boolean>(loadFromLocalStorage('isLooping', true));
  const [steps, setSteps] = useState<Step[]>(loadFromLocalStorage('steps', []));
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Audio file URLs
  const [audioWithClicksUrl, setAudioWithClicksUrl] = useState<string>(loadFromLocalStorage('audioWithClicksUrl', ''));
  const [harmonicWithClicksUrl, setHarmonicWithClicksUrl] = useState<string>(loadFromLocalStorage('harmonicWithClicksUrl', ''));
  const [percussiveWithClicksUrl, setPercussiveWithClicksUrl] = useState<string>(loadFromLocalStorage('percussiveWithClicksUrl', ''));
  const [harmonicOriginalUrl, setHarmonicOriginalUrl] = useState<string>(loadFromLocalStorage('harmonicOriginalUrl', ''));
  const [percussiveOriginalUrl, setPercussiveOriginalUrl] = useState<string>(loadFromLocalStorage('percussiveOriginalUrl', ''));
  const [clicksOnlyUrl, setClicksOnlyUrl] = useState<string>(loadFromLocalStorage('clicksOnlyUrl', ''));
  
  // Visualization data
  const [waveformImage, setWaveformImage] = useState<string>(loadFromLocalStorage('waveformImage', ''));
  const [isDummyData, setIsDummyData] = useState<boolean>(loadFromLocalStorage('isDummyData', false));
  
  // Beat detection data
  const [beats, setBeats] = useState<number[]>(loadFromLocalStorage('beats', []));
  const [downbeats, setDownbeats] = useState<number[]>(loadFromLocalStorage('downbeats', []));
  const [videoDuration, setVideoDuration] = useState<number>(loadFromLocalStorage('videoDuration', 0));
  
  // Progress tracking
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isPollingProgress, setIsPollingProgress] = useState<boolean>(false);
  const pollingIntervalRef = useRef<TimeoutRef | null>(null);
  const failedPollAttemptsRef = useRef<number>(0);
  
  // Playback state
  const checkTimeInterval = useRef<TimeoutRef | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fadeInRef = useRef<HTMLDivElement>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>(loadFromLocalStorage('videoUrl', ''));
  const [playbackRate, setPlaybackRate] = useState<number>(loadFromLocalStorage('playbackRate', 1));
  const [isSpeedControlExpanded, setIsSpeedControlExpanded] = useState<boolean>(false);

  // Reset connection status when polling starts
  useEffect(() => {
    if (isPollingProgress && videoId) {
      // Reset error message when polling starts
      setError("");
      // Reset connection failure counter
      failedPollAttemptsRef.current = 0;
      // Set status to loading
      setStatusMessage("Connecting to server...");
    }
  }, [isPollingProgress, videoId]);

  // Add a special connection status indicator
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connected');
  
  // Update connection status based on polling success/failure
  useEffect(() => {
    // If we have an error showing, set connection status to error
    if (statusMessage && statusMessage.includes("Error connecting")) {
      setConnectionStatus('error');
    } else if (isLoading) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('connected');
    }
  }, [statusMessage, isLoading]);

  /**
   * Effect to reset the connection if it's been in error state for too long
   */
  useEffect(() => {
    let reconnectTimer: any = null;
    
    if (connectionStatus === 'error' && videoId) {
      // Try to reconnect after 5 seconds
      reconnectTimer = setTimeout(() => {
        console.log("RECONNECT: Attempting to reconnect to server...");
        setStatusMessage("Reconnecting to server...");
        
        // Use a fresh API URL based on current window location
        const currHost = window.location.hostname;
        const currProtocol = window.location.protocol;
        const currApiUrl = `${currProtocol}//${currHost}:7081`;
        
        // Reset failure counter
        failedPollAttemptsRef.current = 0;
        
        // Try to fetch progress with the fresh URL
        fetchProgressWithUrl(videoId, currApiUrl);
        
        // Restart polling if needed
        if (!pollingIntervalRef.current) {
          setIsPollingProgress(true);
          pollingIntervalRef.current = setInterval(() => {
            fetchProgressWithUrl(videoId, currApiUrl);
          }, 2000);
        }
      }, 5000);
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [connectionStatus, videoId]);

  /**
   * Save application state to localStorage whenever relevant state changes
   */
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

  /**
   * Automatically load saved analysis results when the page loads
   */
  useEffect(() => {
    // If we have a saved videoId but no analysis results yet, try to load them
    if (videoId && !isLoading && steps.length === 0 && beats.length === 0) {
      console.log('Attempting to restore analysis results for video:', videoId);
      fetchProgress(videoId);
    }
  }, [videoId]);

  /**
   * Handle video player ready event - sets up the player object
   * Works with both YouTube and custom HTML5 players
   */
  const handleVideoReady = (player: YouTubePlayer | HTMLVideoElement) => {
    // Handle both YouTube player and custom video player
    if ('getCurrentTime' in player) {
      // It's YouTube player
      setPlayer(player as YouTubePlayer);
    } else {
      // It's HTML video element - setup our own player object with YouTube-like API
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

  /**
   * Navigation and playback control handlers
   */
  // Handle step click in timeline
  const handleStepClick = (index: number) => {
    if (player) {
      setCurrentStep(index);
      player.seekTo(steps[index].start, true);
      player.playVideo();
      setIsPlaying(true);
    }
  };

  // Go to next step
  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      handleStepClick(currentStep + 1);
    }
  };

  // Go to previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      handleStepClick(currentStep - 1);
    }
  };

  /**
   * Progress tracking and API communication
   */
  // Fetch processing progress from the server
  const fetchProgress = async (videoIdToCheck: string) => {
    try {
      console.log(`PROGRESS POLL: Fetching progress for video ID: ${videoIdToCheck}`);
      
      // First try the /api/progress endpoint with direct API_URL
      let response = await fetch(`${API_URL}/api/progress/${videoIdToCheck}`);
      let tried_alt = false;
      
      // If that fails, try the alternate /progress endpoint
      if (!response.ok) {
        console.log('PROGRESS POLL: API endpoint failed, trying alternate endpoint');
        tried_alt = true;
        response = await fetch(`${API_URL}/progress/${videoIdToCheck}`);
      }
      
      console.log(`PROGRESS POLL: Response status: ${response.status} (${tried_alt ? 'alternate' : 'primary'} endpoint)`);
      
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
          
          // Set video URL if available - ensure we log for debugging
          if (data.video_url) {
            console.log(`PROGRESS POLL: Setting video URL: ${API_URL}${data.video_url}`);
            setVideoUrl(`${API_URL}${data.video_url}`);
            saveToLocalStorage('videoUrl', `${API_URL}${data.video_url}`);
          } else {
            console.log('PROGRESS POLL: No video_url in data, using YouTube fallback player');
            setVideoUrl('');
            saveToLocalStorage('videoUrl', '');
          }
          
          // Set audio file URLs
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
        setProgress(progressData.progress || 0);
        setStatusMessage(progressData.status_message || 'Processing...');
        
        // Update document title with progress
        document.title = `${progressData.progress || 0}% - Dance Beat Analyzer`;
        
        // If the progress is 100 or there was an error, stop polling
        if ((progressData.progress && progressData.progress >= 100) || 
            (progressData.status_message && progressData.status_message.includes('Error'))) {
          console.log('PROGRESS POLL: Stopping polling - process complete or error occurred');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
        }
      } else {
        console.warn(`PROGRESS POLL: Failed to fetch progress: ${response.status} ${response.statusText}`);
        
        // After several failed attempts, stop polling
        failedPollAttemptsRef.current = (failedPollAttemptsRef.current || 0) + 1;
        
        if (failedPollAttemptsRef.current > 5) {
          console.error('PROGRESS POLL: Too many failed attempts, stopping polling');
          setStatusMessage('Error connecting to server. Please try again.');
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
        }
      }
    } catch (error) {
      console.error('PROGRESS POLL: Error fetching progress:', error);
      
      // After several failed attempts, stop polling
      failedPollAttemptsRef.current = (failedPollAttemptsRef.current || 0) + 1;
      
      if (failedPollAttemptsRef.current > 5) {
        console.error('PROGRESS POLL: Too many failed attempts, stopping polling');
        setStatusMessage('Error connecting to server. Please try again.');
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          setIsPollingProgress(false);
        }
      }
    }
  };

  /**
   * Fetch progress with a specific API URL
   * Used for reconnection attempts
   */
  const fetchProgressWithUrl = async (videoIdToCheck: string, apiUrl: string) => {
    try {
      console.log(`PROGRESS POLL: Fetching progress for video ID: ${videoIdToCheck} with custom URL: ${apiUrl}`);
      
      // First try the /api/progress endpoint with the provided API URL
      let response = await fetch(`${apiUrl}/api/progress/${videoIdToCheck}`);
      let tried_alt = false;
      
      // If that fails, try the alternate /progress endpoint
      if (!response.ok) {
        console.log('PROGRESS POLL: API endpoint failed, trying alternate endpoint');
        tried_alt = true;
        response = await fetch(`${apiUrl}/progress/${videoIdToCheck}`);
      }
      
      console.log(`PROGRESS POLL: Response status: ${response.status} (${tried_alt ? 'alternate' : 'primary'} endpoint)`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('PROGRESS POLL: Progress response data:', data);
        
        // Process the response data similar to fetchProgress
        // This handles both progress updates and complete results
        if (data.videoId && !('progress' in data)) {
          console.log('PROGRESS POLL: Analysis complete, received full data');
          
          // Process the complete data
          if (data.steps && Array.isArray(data.steps)) {
            setSteps(data.steps);
          }
          
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
            console.log(`PROGRESS POLL: Setting video URL: ${apiUrl}${data.video_url}`);
            setVideoUrl(`${apiUrl}${data.video_url}`);
            saveToLocalStorage('videoUrl', `${apiUrl}${data.video_url}`);
          } else {
            console.log('PROGRESS POLL: No video_url in data, using YouTube fallback player');
            setVideoUrl('');
            saveToLocalStorage('videoUrl', '');
          }
          
          // Set audio file URLs with custom API URL
          setAudioWithClicksUrl(data.audio_with_clicks_url ? `${apiUrl}${data.audio_with_clicks_url}` : '');
          setHarmonicWithClicksUrl(data.harmonic_audio_url ? `${apiUrl}${data.harmonic_audio_url}` : '');
          setPercussiveWithClicksUrl(data.percussive_audio_url ? `${apiUrl}${data.percussive_audio_url}` : '');
          setHarmonicOriginalUrl(data.harmonic_original_url ? `${apiUrl}${data.harmonic_original_url}` : '');
          setPercussiveOriginalUrl(data.percussive_original_url ? `${apiUrl}${data.percussive_original_url}` : '');
          setClicksOnlyUrl(data.clicks_only_url ? `${apiUrl}${data.clicks_only_url}` : '');
          
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
          setConnectionStatus('connected');
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Handle progress update
        const progressData = data as ProgressData;
        setProgress(progressData.progress || 0);
        setStatusMessage(progressData.status_message || 'Processing...');
        setConnectionStatus('connected');
        
        // If the progress is 100 or there was an error, stop polling
        if ((progressData.progress && progressData.progress >= 100) || 
            (progressData.status_message && progressData.status_message.includes('Error'))) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            setIsPollingProgress(false);
          }
        }
      } else {
        console.warn(`PROGRESS POLL: Failed to fetch progress: ${response.status} ${response.statusText}`);
        failedPollAttemptsRef.current = (failedPollAttemptsRef.current || 0) + 1;
      }
    } catch (error) {
      console.error('PROGRESS POLL: Error fetching progress with custom URL:', error);
      failedPollAttemptsRef.current = (failedPollAttemptsRef.current || 0) + 1;
    }
  };

  /**
   * Effect to manage polling for progress updates
   */
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

  /**
   * Effect to handle automatic step looping and advancement
   */
  useEffect(() => {
    if (player && steps.length > 0) {
      if (checkTimeInterval.current) {
        clearInterval(checkTimeInterval.current);
      }

      // Check current time against step boundaries
      checkTimeInterval.current = setInterval(() => {
        const currentTime = player.getCurrentTime();
        const currentStepData = steps[currentStep];

        // If we've reached the end of the current step
        if (currentTime >= currentStepData.end) {
          if (isLooping) {
            // Loop back to the start of the current step
            player.seekTo(currentStepData.start, true);
          } else if (currentStep < steps.length - 1) {
            // Advance to the next step
            handleNextStep();
          }
        }
      }, 100) as unknown as TimeoutRef;

      // Cleanup interval on unmount or when dependencies change
      return () => {
        if (checkTimeInterval.current) {
          clearInterval(checkTimeInterval.current);
        }
      };
    }
  }, [player, currentStep, isLooping, steps]);

  // Add a more robust direct api access function
  const directApiCall = async (endpoint: string, options: RequestInit = {}) => {
    try {
      // Always use the current window origin (including the current port)
      const apiUrl = window.location.origin;
      
      // Add default headers if not provided
      if (!options.headers) {
        options.headers = {
          'Content-Type': 'application/json',
        };
      }
      
      console.log(`API CALL: ${apiUrl}${endpoint}`);
      const response = await fetch(`${apiUrl}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call error for ${endpoint}:`, error);
      throw error;
    }
  };

  /**
   * Main video analysis function
   * Sends the video URL to the backend API for processing
   */
  const analyzeVideo = async (url: string) => {
    if (isLoading) return;

    setError('');
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Initializing...');
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Reset failed poll attempts counter
    failedPollAttemptsRef.current = 0;

    try {
      // First check connectivity to the backend
      try {
        await directApiCall('/api/external-check');
        console.log('Backend connectivity check passed');
      } catch (error) {
        console.error('Backend connectivity check failed:', error);
        setStatusMessage('Error connecting to backend server. Please check your network connection.');
        throw new Error('Cannot connect to backend server');
      }
      
      // Extract video ID client-side for better UX
      const extractedVideoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
      
      if (extractedVideoId) {
        setVideoId(extractedVideoId);
      } else {
        console.warn('Failed to extract video ID from URL');
      }
      
      // Send the analysis request
      const response = await directApiCall('/api/analyze-video', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      
      console.log('Analysis response:', response);
      
      // Get video ID from the response
      const returnedVideoId = response.videoId;
      console.log(`Using video ID for polling: ${returnedVideoId}`);
      
      // Set the videoId from the response
      setVideoId(returnedVideoId);
      
      // Start polling for progress updates
      setIsPollingProgress(true);
      
      // Set up the polling interval
      pollForProgress(returnedVideoId);
    } catch (error) {
      console.error('Error analyzing video:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze video');
      setIsLoading(false);
      setIsPollingProgress(false);
    }
  };

  /**
   * Reusable function to handle progress polling
   */
  const pollForProgress = (videoId: string) => {
    console.log(`Setting up polling for ${videoId}`);
    
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Reset failed attempts counter
    failedPollAttemptsRef.current = 0;
    
    // Do an immediate progress check
    checkVideoProgress(videoId);
    
    // Set up a polling interval
    pollingIntervalRef.current = setInterval(() => {
      checkVideoProgress(videoId);
    }, 1500);
  };

  /**
   * Function to check video processing progress
   */
  const checkVideoProgress = async (videoId: string) => {
    if (!videoId) return;
    
    try {
      console.log(`Checking progress for ${videoId}`);
      
      // Try the /api/progress endpoint
      const progressData = await directApiCall(`/api/progress/${videoId}`);
      
      // Reset failed attempts counter on success
      failedPollAttemptsRef.current = 0;
      
      // Handle the progress data
      if (progressData) {
        console.log('Progress data:', progressData);
        
        // If we have progress information
        if (typeof progressData.progress === 'number') {
          setProgress(progressData.progress);
          
          if (progressData.status_message) {
            setStatusMessage(progressData.status_message);
          }
          
          // Check if processing is complete
          if (progressData.progress >= 100 || progressData.steps) {
            handleProcessingComplete(progressData);
          }
        } 
        // Otherwise, we might have the full result
        else if (progressData.steps) {
          handleProcessingComplete(progressData);
        }
      }
    } catch (error) {
      console.error('Error checking progress:', error);
      
      // Increment failed attempts counter
      failedPollAttemptsRef.current = (failedPollAttemptsRef.current || 0) + 1;
      
      // After several failed attempts, show error but continue polling
      if (failedPollAttemptsRef.current > 3) {
        setStatusMessage('Error connecting to server. Still trying...');
      }
      
      // After many failures, stop polling
      if (failedPollAttemptsRef.current > 10) {
        console.error('Too many failed attempts, stopping polling');
        setStatusMessage('Error connecting to server. Please try again.');
        setIsLoading(false);
        setIsPollingProgress(false);
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }
  };

  /**
   * Handle when processing is complete
   */
  const handleProcessingComplete = (data: any) => {
    console.log('Processing complete, setting data');
    setIsLoading(false);
    setIsPollingProgress(false);
    
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Get the API base URL
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const apiUrl = `${protocol}//${host}:7081`;
    
    // Update state with received data
    if (data.steps) setSteps(data.steps);
    if (data.duration) setVideoDuration(data.duration);
    if (data.audio_with_clicks_url) setAudioWithClicksUrl(`${apiUrl}${data.audio_with_clicks_url}`);
    if (data.waveform_image) setWaveformImage(data.waveform_image);
    
    // Set video URL if available
    if (data.video_url) {
      console.log(`Setting video URL: ${apiUrl}${data.video_url}`);
      setVideoUrl(`${apiUrl}${data.video_url}`);
      saveToLocalStorage('videoUrl', `${apiUrl}${data.video_url}`);
    } else {
      console.log("No video_url provided in data, using YouTube fallback");
      setVideoUrl('');
      saveToLocalStorage('videoUrl', '');
    }
    
    // If the first step exists, jump to it
    if (data.steps && data.steps.length > 0) {
      setCurrentStep(0);
      if (player) {
        player.seekTo(data.steps[0].start, true);
      }
    }
    
    // Reset any errors
    setError('');
    setStatusMessage('Analysis complete');
  };

  /**
   * Prompt user for a YouTube video URL to analyze
   */
  const handleVideoInput = async () => {
    const url = prompt('Enter YouTube video URL:\nPlease use a direct video URL (not a playlist)\nExample: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    if (url) {
      // Validate it's a YouTube URL
      if (!url.match(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/)) {
        setError('Invalid YouTube URL format. Please provide a valid YouTube video URL.');
        return;
      }
      await analyzeVideo(url);
    }
  };

  const totalDuration = steps[steps.length - 1]?.end || 0;

  /**
   * Format seconds into MM:SS format
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Timeline navigation functions
   */
  // Scroll the timeline horizontally
  const scrollTimeline = (direction: 'left' | 'right') => {
    if (!timelineRef.current) return;
    
    const scrollAmount = direction === 'left' ? -200 : 200;
    timelineRef.current.scrollLeft += scrollAmount;
  };

  // Scroll to the current step in the timeline
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

  // Automatically scroll timeline when current step changes
  useEffect(() => {
    scrollToCurrentStep();
  }, [currentStep]);

  // YouTube player options
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

  /**
   * Handle steps generated from TimelineEditor
   */
  const handleStepsGenerated = (newSteps: Step[]) => {
    setSteps(newSteps);
    setCurrentStep(0);
    
    // If player exists, seek to the first step
    if (player && newSteps.length > 0) {
      player.seekTo(newSteps[0].start, true);
    }
  };

  /**
   * Effect to update current playback time display
   */
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

  /**
   * Analyze video in separate steps (for manual analysis mode)
   */
  const handleVideoAnalysis = async () => {
    if (!videoId) return;
    
    setIsLoading(true);
    setProgress(0);
    setStatusMessage('Starting video analysis...');
    
    try {
      // Construct the direct backend URL
      const host = window.location.hostname;
      const protocol = window.location.protocol;
      const directBackendUrl = `${protocol}//${host}:7081`;
      
      // Step 1: Download audio
      setStatusMessage('Downloading audio...');
      setProgress(10);
      const response = await fetch(`${directBackendUrl}/api/download_audio?video_id=${videoId}`);
      const { audio_path } = await response.json();
      
      // Step 2: Separate audio
      setStatusMessage('Separating audio...');
      setProgress(30);
      const separateResponse = await fetch(`${directBackendUrl}/api/separate_audio?audio_path=${audio_path}`);
      const { vocals_path, drums_path } = await separateResponse.json();
      
      // Step 3: Detect beats and downbeats
      setStatusMessage('Detecting beats and downbeats...');
      setProgress(50);
      const beatsResponse = await fetch(`${directBackendUrl}/api/detect_beats?audio_path=${vocals_path}`);
      const { beats, downbeats } = await beatsResponse.json();
      
      // Step 4: Generate dance steps
      setStatusMessage('Generating dance steps...');
      setProgress(90);
      const stepsResponse = await fetch(`${directBackendUrl}/api/generate_steps`, {
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

  /**
   * Main component render
   */
  return (
    <>
      {/* Global styles */}
      <GlobalStyle />
      
      <Container>
        <Title>Dance Beat Analyzer</Title>
        
        {/* Loading overlay with progress indicator */}
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
        
        {/* Error message display */}
        {error && (
          <ErrorMessage>
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={() => setError('')}>Dismiss</button>
          </ErrorMessage>
        )}
        
        <MainContent>
          {/* Welcome screen - shown when no video is loaded */}
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
          
          {/* Main content area - shown when a video is loaded */}
          {videoId && !isLoading && (
            <>
              {/* Show fallback notice if using dummy data */}
              {isDummyData && (
                <FallbackNotice>
                  <strong>Using Demo Data</strong>
                  We encountered an issue with analyzing this video, so we're showing you sample data instead.
                </FallbackNotice>
              )}
              
              {/* Video player */}
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
              
              {/* Playback speed controls */}
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
                  {/* Preset speed buttons */}
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
                  
                  {/* Speed slider for fine control */}
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
              
              {/* Step information and timeline */}
              {steps.length > 0 && (
                <>
                  {/* Current step info */}
                  <StepInfo>
                    Currently learning <span>{steps[currentStep].description}</span> from <span>{steps[currentStep].start.toFixed(1)}s</span> to <span>{steps[currentStep].end.toFixed(1)}s</span>
                  </StepInfo>
                  
                  {/* Timeline with step segments */}
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
              
              {/* Timeline editor for advanced editing */}
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
              
              {/* Button to start over with a new video */}
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <Button onClick={handleNewVideo}>
                  Analyze Another Video
                </Button>
              </div>
            </>
          )}
        </MainContent>
      </Container>
      
      {/* Environment indicator badge */}
      <EnvironmentBadge color={isDevelopment ? '#2196F3' : '#4CAF50'}>
        {isDevelopment ? 'DEV' : 'PROD'} | v{appVersion} | {API_URL.includes('localhost') ? 'Local API' : 'Remote API'}
      </EnvironmentBadge>
    </>
  );
}

export default App; 