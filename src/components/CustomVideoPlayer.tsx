import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface CustomVideoPlayerProps {
  videoId: string;
  videoUrl?: string;
  onReady?: (player: HTMLVideoElement) => void;
  onStateChange?: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
  currentStep?: number;
  steps?: Array<{start: number; end: number; description: string}>;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  playbackRate?: number;
}

const VideoWrapper = styled.div<{ isFullscreen: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  border-radius: ${props => props.isFullscreen ? '0' : '8px'};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const VideoElement = styled.video<{ mirrored: boolean; isFullscreen: boolean }>`
  max-width: 100%;
  max-height: 100%;
  width: ${props => props.isFullscreen ? '100%' : 'auto'};
  height: ${props => props.isFullscreen ? '100%' : 'auto'};
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) ${props => props.mirrored ? 'scaleX(-1)' : 'scaleX(1)'};
  object-fit: contain;
`;

const IframeContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
`;

const StyledIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const VideoControls = styled.div<{ isFullscreen: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  padding: ${props => props.isFullscreen ? '15px 20px' : '10px 15px'};
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
  
  ${VideoWrapper}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.5rem;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #1DB954;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  
  &:hover {
    height: 8px;
  }
`;

const ProgressFill = styled.div<{ width: number }>`
  height: 100%;
  width: ${props => props.width}%;
  background: #1DB954;
  border-radius: 2px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 12px;
    background: #1DB954;
    border-radius: 50%;
    display: none;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
    
    ${ProgressBar}:hover & {
      display: block;
    }
  }
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: 0.8rem;
  margin-left: 10px;
  white-space: nowrap;
`;

const StepMarker = styled.div<{ left: number; isCurrentStep: boolean }>`
  position: absolute;
  bottom: 0;
  left: ${props => props.left}%;
  width: 2px;
  height: ${props => props.isCurrentStep ? '100%' : '70%'};
  background-color: ${props => props.isCurrentStep ? '#FFD700' : 'rgba(255, 255, 255, 0.5)'};
  transform: translateX(-50%);
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 15;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #1DB954;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  padding: 20px;
  text-align: center;
  z-index: 20;
`;

const FallbackMessage = styled.div`
  margin-top: 10px;
  font-size: 0.9rem;
  color: #aaa;
`;

const NavigationControls = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 10;
`;

const StepIndicator = styled.div<{ isFullscreen: boolean }>`
  position: absolute;
  top: ${props => props.isFullscreen ? '30px' : '20px'};
  right: ${props => props.isFullscreen ? '30px' : '20px'};
  background: rgba(0, 0, 0, 0.7);
  color: #FFD700;
  font-weight: bold;
  padding: ${props => props.isFullscreen ? '12px 16px' : '8px 12px'};
  border-radius: 4px;
  font-size: ${props => props.isFullscreen ? '1.1rem' : '0.9rem'};
  z-index: 10;
  display: flex;
  align-items: center;
  gap: ${props => props.isFullscreen ? '12px' : '8px'};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 0, 0.2);
`;

const StepControls = styled.div<{ isFullscreen: boolean }>`
  position: absolute;
  bottom: ${props => props.isFullscreen ? '100px' : '70px'};
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 15px;
  z-index: 10;
  padding: 0 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  
  ${VideoWrapper}:hover & {
    opacity: 1;
  }
`;

const StepButton = styled.button<{ active?: boolean }>`
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: ${props => props.active ? 'rgba(29, 185, 84, 0.7)' : 'rgba(0, 0, 0, 0.7)'};
  
  &:hover {
    background: ${props => props.active ? 'rgba(29, 185, 84, 0.9)' : 'rgba(255, 255, 255, 0.15)'};
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: ${props => props.active ? 'rgba(29, 185, 84, 0.7)' : 'rgba(0, 0, 0, 0.7)'};
      transform: none;
    }
  }
`;

const ControlButton = styled.button<{ active?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.1);
  }
  
  ${props => props.active && `
    background: #1DB954;
    border-color: #1DB954;
    
    &:hover {
      background: #1ed760;
    }
  `}
`;

const LoopFeedback = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: ${props => props.color || '#1DB954'};
  padding: 15px 20px;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: bold;
  z-index: 25;
  border: 1px solid ${props => props.color || '#1DB954'};
  animation: fadeInOut 1.5s ease-in-out forwards;
  
  @keyframes fadeInOut {
    0% { opacity: 0; }
    15% { opacity: 1; }
    85% { opacity: 1; }
    100% { opacity: 0; }
  }
`;

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoId,
  videoUrl,
  onReady,
  onStateChange,
  onTimeUpdate,
  currentStep,
  steps = [],
  onPrevStep,
  onNextStep,
  playbackRate = 1
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoWidth, setVideoWidth] = useState<number>(0);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [isLooping, setIsLooping] = useState(true);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showLoopFeedback, setShowLoopFeedback] = useState<boolean>(false);
  const [loopFeedbackText, setLoopFeedbackText] = useState<string>('');

  // Update playback rate when prop changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Initialize video player
  useEffect(() => {
    if (videoRef.current) {
      // Set up event listeners
      const video = videoRef.current;
      
      // Set initial playback rate
      video.playbackRate = playbackRate;
      
      const handleVideoReady = () => {
        setIsLoading(false);
        setDuration(video.duration);
        setVideoWidth(video.videoWidth);
        setVideoHeight(video.videoHeight);
        if (onReady) {
          onReady(video);
        }
      };
      
      const handleTimeUpdate = () => {
        const currentVideoTime = video.currentTime;
        setCurrentTime(currentVideoTime);
        setProgress((currentVideoTime / video.duration) * 100);
        
        if (onTimeUpdate) {
          onTimeUpdate(currentVideoTime);
        }
        
        // Only handle step-based looping or navigation if we have steps and a current step
        if (currentStep !== undefined && steps && steps.length > 0 && currentStep < steps.length) {
          const currentStepData = steps[currentStep];
          
          // Check if we've reached the end of the current step
          if (currentVideoTime >= currentStepData.end) {
            if (isLooping) {
              // LOOPING ON: Jump back to the start of the current step
              console.log(`Looping: Jumping back to step start (${currentStepData.start}s)`);
              video.currentTime = currentStepData.start;
            } else {
              // LOOPING OFF: Move to next step or pause at the end
              console.log(`Looping disabled: End of step reached`);
              
              // If not the last step, go to next step
              if (currentStep < steps.length - 1 && onNextStep) {
                console.log(`Moving to next step: ${currentStep + 1}`);
                onNextStep();
              } else if (currentStep === steps.length - 1) {
                // If it's the last step, just pause at the end
                console.log(`Last step reached, pausing`);
                video.pause();
                setIsPlaying(false);
                if (onStateChange) onStateChange(false);
              }
            }
          }
        }
      };
      
      const handleError = () => {
        setIsLoading(false);
        setError("Error loading video. Using YouTube player as fallback.");
      };
      
      // Add event listeners
      video.addEventListener('loadedmetadata', handleVideoReady);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('error', handleError);
      
      // Clean up
      return () => {
        video.removeEventListener('loadedmetadata', handleVideoReady);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('error', handleError);
      };
    }
  }, [videoRef, onReady, onTimeUpdate, isLooping, currentStep, steps, playbackRate, onNextStep, onStateChange]);
  
  // Update video source when videoUrl changes
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.load();
      setIsLoading(true);
    }
  }, [videoUrl]);
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
      if (onStateChange) {
        onStateChange(!isPlaying);
      }
    }
  };
  
  // Handle seeking
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const newTime = clickPosition * duration;
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(clickPosition * 100);
    }
  };
  
  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle step markers
  const renderStepMarkers = () => {
    return steps.map((step, index) => {
      const position = (step.start / duration) * 100;
      const isCurrentStepMarker = index === currentStep;
      
      return (
        <StepMarker 
          key={`step-marker-${index}`}
          left={position}
          isCurrentStep={isCurrentStepMarker}
        />
      );
    });
  };
  
  // Toggle mirror mode
  const toggleMirror = () => {
    setIsMirrored(!isMirrored);
  };
  
  // Update the toggle loop function with better visual feedback
  const toggleLoop = () => {
    const newLoopState = !isLooping;
    console.log(`Loop state changed: ${isLooping ? 'ON' : 'OFF'} → ${newLoopState ? 'ON' : 'OFF'}`);
    setIsLooping(newLoopState);
    
    // Show visual feedback
    setLoopFeedbackText(newLoopState ? 'Loop: ON' : 'Loop: OFF');
    setShowLoopFeedback(true);
    setTimeout(() => setShowLoopFeedback(false), 1500);
    
    // If turning looping off while at the end of a step, move forward slightly to prevent immediate loop
    if (!newLoopState && videoRef.current && currentStep !== undefined && steps.length > 0) {
      const currentStepData = steps[currentStep];
      const videoTime = videoRef.current.currentTime;
      
      // If we're very close to the end (within 0.1s), move just slightly past the end
      if (Math.abs(videoTime - currentStepData.end) < 0.1) {
        console.log(`Adjusting time to prevent accidental loop: ${videoTime} → ${currentStepData.end + 0.1}`);
        videoRef.current.currentTime = currentStepData.end + 0.1;
      }
    }
  };
  
  // Handle next step
  const handleNextStep = () => {
    if (onNextStep) {
      onNextStep();
    }
  };
  
  // Handle previous step
  const handlePrevStep = () => {
    if (onPrevStep) {
      onPrevStep();
    }
  };

  // Add fullscreen toggle functionality
  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Update fullscreen state based on document state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get current step description
  const getCurrentStepInfo = () => {
    if (currentStep !== undefined && steps && steps.length > 0 && currentStep < steps.length) {
      return steps[currentStep].description;
    }
    return '';
  };

  return (
    <VideoWrapper ref={wrapperRef} isFullscreen={isFullscreen}>
      {videoUrl ? (
        <VideoElement
          ref={videoRef}
          mirrored={isMirrored}
          isFullscreen={isFullscreen}
          onClick={togglePlayPause}
          onPlay={() => {
            setIsPlaying(true);
            if (onStateChange) onStateChange(true);
          }}
          onPause={() => {
            setIsPlaying(false);
            if (onStateChange) onStateChange(false);
          }}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </VideoElement>
      ) : (
        <IframeContainer>
          <StyledIframe 
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video player"
          />
        </IframeContainer>
      )}
      
      {videoUrl && (
        <>
          {/* Current Step Indicator - Fixed to not duplicate text */}
          {currentStep !== undefined && steps.length > 0 && (
            <StepIndicator isFullscreen={isFullscreen}>
              <svg width={isFullscreen ? "20" : "16"} height={isFullscreen ? "20" : "16"} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" fill="#FFD700"/>
              </svg>
              Step {currentStep + 1}: {getCurrentStepInfo()}
            </StepIndicator>
          )}
          
          {steps.length > 0 && (
            <StepControls isFullscreen={isFullscreen}>
              <StepButton 
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                title="Previous Step"
              >
                {/* Previous icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Prev Step
              </StepButton>
              
              <StepButton 
                onClick={toggleLoop} 
                active={isLooping}
                title={isLooping ? "Loop: ON" : "Loop: OFF"}
              >
                {/* Loop icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 2L21 6L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 11V9C3 7.89543 3.89543 7 5 7H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 22L3 18L7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 13V15C21 16.1046 20.1046 17 19 17H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isLooping ? "Loop: ON" : "Loop: OFF"}
              </StepButton>
              
              <StepButton 
                onClick={handleNextStep}
                disabled={currentStep === steps.length - 1}
                title="Next Step"
              >
                Next Step
                {/* Next icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </StepButton>
            </StepControls>
          )}
          
          {/* Updated Video Controls with all buttons in one line */}
          <VideoControls isFullscreen={isFullscreen}>
            {/* Mirror button on left */}
            <ControlButton 
              onClick={toggleMirror}
              active={isMirrored}
              title="Mirror Video"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4V20M4 16.5L8 19V14L4 16.5ZM20 16.5L16 19V14L20 16.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </ControlButton>
            
            {/* Play/Pause button */}
            <PlayButton onClick={togglePlayPause}>
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H6V20H10V4Z" fill="currentColor"/>
                  <path d="M18 4H14V20H18V4Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V19L19 12L8 5Z" fill="currentColor"/>
                </svg>
              )}
            </PlayButton>
            
            {/* Progress bar */}
            <ProgressBar ref={progressRef} onClick={handleSeek}>
              <ProgressFill width={progress} />
              {renderStepMarkers()}
            </ProgressBar>
            
            {/* Time display */}
            <TimeDisplay>
              {formatTime(currentTime)} / {formatTime(duration)}
            </TimeDisplay>
            
            {/* Fullscreen button on right */}
            <ControlButton
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </ControlButton>
          </VideoControls>
          
          {/* Loop state feedback overlay */}
          {showLoopFeedback && (
            <LoopFeedback color={isLooping ? '#1DB954' : '#ff5555'}>
              {loopFeedbackText}
            </LoopFeedback>
          )}
        </>
      )}
      
      {isLoading && videoUrl && (
        <LoadingOverlay>
          <Spinner />
          <div style={{ marginTop: '10px' }}>Loading video...</div>
        </LoadingOverlay>
      )}
      
      {error && (
        <ErrorMessage>
          <div>{error}</div>
          <FallbackMessage>
            The app will continue using YouTube's player.
          </FallbackMessage>
        </ErrorMessage>
      )}
    </VideoWrapper>
  );
};

export default CustomVideoPlayer; 