import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import styled from 'styled-components';

// Add new interfaces for the edit modes
type EditMode = 'none' | 'delete' | 'add' | 'move' | 'move-all';

interface TimelineEditorProps {
  videoId: string;
  duration: number;
  beats: number[];
  downbeats: number[];
  onStepsGenerated: (steps: Step[]) => void;
  currentTime?: number;
}

interface Step {
  start: number;
  end: number;
  description: string;
}

interface Marker {
  id: string;
  time: number;
  isDownbeat: boolean;
  isCustomized: boolean;
}

// Timeline styling
const EditorContainer = styled.div`
  width: 100%;
  margin: 10px 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  position: relative;
  display: flex;
  gap: 20px;
  align-items: flex-start;
`;

const Title = styled.h3`
  color: #1DB954;
  margin-bottom: 20px;
  font-size: 1.4rem;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const Instructions = styled.p`
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  margin-bottom: 16px;
  font-size: 0.9rem;
`;

const TimelineControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 10px;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ControlLabel = styled.span`
  color: white;
  font-size: 0.9rem;
  min-width: max-content;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  background: ${props => props.variant === 'primary' ? '#1DB954' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: ${props => props.variant === 'primary' ? '#1ed760' : 'rgba(255, 255, 255, 0.15)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ZoomControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TimelineWrapper = styled.div`
  width: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 0;
  user-select: none;
`;

const TimelineScrollContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  position: relative;
  height: 80px;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 185, 84, 0.5) rgba(0, 0, 0, 0.2);
  
  &::-webkit-scrollbar {
    height: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 5px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(29, 185, 84, 0.5);
    border-radius: 5px;
    border: 2px solid rgba(0, 0, 0, 0.2);
  }
`;

const TimelineContent = styled.div<{ width: number }>`
  position: relative;
  height: 80px;
  width: ${props => props.width}px;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.3) 50%,
    rgba(0, 0, 0, 0.2) 100%
  );
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
      circle at 50% 100%,
      rgba(29, 185, 84, 0.1) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;

const TimelineRuler = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TimelineTick = styled.div<{ major?: boolean }>`
  position: absolute;
  height: ${props => props.major ? '12px' : '8px'};
  width: 1px;
  background-color: rgba(255, 255, 255, ${props => props.major ? 0.5 : 0.3});
  bottom: 0;
`;

const TimelineLabel = styled.div`
  position: absolute;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.7rem;
  bottom: 14px;
  transform: translateX(-50%);
  white-space: nowrap;
`;

const MarkersContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 0;
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
`;

// Update ThumbnailPreview to prevent cropping
const ThumbnailPreview = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 4px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  display: none;
  margin-bottom: 10px; // Add margin to prevent cropping

  img {
    width: 160px;
    height: 90px;
    object-fit: cover;
    border-radius: 2px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(0, 0, 0, 0.9);
  }
`;

// Update StepSegment to include thumbnail preview
const StepSegment = styled.div<{ isActive: boolean }>`
  position: relative;
  padding: 4px 8px;
  background-color: ${props => props.isActive ? '#1DB954' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.isActive ? 'white' : 'rgba(255, 255, 255, 0.6)'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  transition: all 0.2s ease;
  margin: 0 2px;
  min-width: 80px;
  text-align: center;
  opacity: ${props => props.isActive ? 1 : 0.7};
  box-shadow: ${props => props.isActive ? '0 0 10px rgba(29, 185, 84, 0.3)' : 'none'};
  
  &:hover {
    background-color: ${props => props.isActive ? '#1ed760' : 'rgba(255, 255, 255, 0.15)'};
    opacity: 1;
    ${ThumbnailPreview} {
      display: block;
    }
  }
`;

// Update the Timeline component to handle overflow properly
const Timeline = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: thin;
  scrollbar-color: rgba(29, 185, 84, 0.5) rgba(0, 0, 0, 0.2);
  min-height: 60px;
  
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(29, 185, 84, 0.5);
    border-radius: 4px;
    border: 2px solid rgba(0, 0, 0, 0.2);
  }
`;

// Update BeatMarker to include thumbnail preview
const BeatMarker = styled.div<{ 
  isDownbeat: boolean;
  isCustomized: boolean;
  dragging: boolean;
  isStartingBeat: boolean;
  isInActiveSection?: boolean;
}>`
  position: absolute;
  width: ${props => props.isStartingBeat ? "6px" : "4px"};
  height: ${props => {
    if (props.isStartingBeat) return "40px";
    if (props.isDownbeat) return "30px";
    return "20px";
  }};
  background-color: ${props => {
    if (props.dragging) return "#FFD700";
    if (props.isStartingBeat) return "#00ff00";
    if (props.isDownbeat) return props.isInActiveSection ? "#1DB954" : "rgba(29, 185, 84, 0.5)";
    return "rgba(255, 255, 255, 0.3)";
  }};
  top: ${props => props.isDownbeat ? "5px" : "10px"};
  transform: translateX(-50%);
  cursor: ${props => props.dragging ? "grabbing" : "grab"};
  border-radius: 2px;
  transition: all 0.3s ease;
  z-index: ${props => props.dragging ? 10 : (props.isStartingBeat ? 5 : 1)};
  opacity: ${props => props.isInActiveSection ? 1 : 0.7};
  box-shadow: ${props => props.isInActiveSection ? `
    0 0 10px ${props.isStartingBeat ? "rgba(0, 255, 0, 0.3)" : "rgba(29, 185, 84, 0.3)"}
  ` : 'none'};
  
  &:hover {
    height: ${props => {
      if (props.isStartingBeat) return "45px";
      if (props.isDownbeat) return "35px";
      return "25px";
    }};
    width: ${props => props.isStartingBeat ? "8px" : "6px"};
    background-color: ${props => {
      if (props.dragging) return "#FFD700";
      if (props.isStartingBeat) return "#00ff00";
      if (props.isDownbeat) return "#1ed760";
      return "rgba(255, 255, 255, 0.7)";
    }};

    ${ThumbnailPreview} {
      display: block;
    }
  }
  
  &::after {
    content: "";
    position: absolute;
    width: ${props => props.isStartingBeat ? "14px" : "10px"};
    height: ${props => props.isStartingBeat ? "14px" : "10px"};
    background-color: ${props => {
      if (props.dragging) return "#FFD700";
      if (props.isStartingBeat) return "#00ff00";
      if (props.isDownbeat) return "#1DB954";
      return "rgba(255, 255, 255, 0.5)";
    }};
    border-radius: 50%;
    top: ${props => props.isStartingBeat ? "-7px" : "-5px"};
    left: 50%;
    transform: translateX(-50%);
    display: ${props => props.isDownbeat ? "block" : "none"};
  }

  ${props => props.isCustomized && `
    border: 1px dashed #FFD700;
  `}
`;

const StepIndicator = styled.div<{ left: number; width: number; color: string; isActive: boolean }>`
  position: absolute;
  height: 5px;
  background-color: ${props => props.isActive ? props.color : `${props.color}33`};
  bottom: 10px;
  left: ${props => props.left}px;
  width: ${props => props.width}px;
  border-radius: 2px;
  z-index: 2;
  transition: all 0.3s ease;
  box-shadow: ${props => props.isActive ? `
    0 0 10px ${props.color}66,
    0 0 20px ${props.color}33,
    0 0 30px ${props.color}22
  ` : 'none'};
`;

const StepControls = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const StepSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ControlsGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const Select = styled.select`
  background: rgba(0, 0, 0, 0.3);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 100px;
  
  &:focus {
    outline: none;
    border-color: #1DB954;
  }
`;

const StepVisualPreview = styled.div`
  width: 100%;
  height: 40px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  margin-top: 10px;
`;

const DownbeatInfoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 215, 0, 0.2);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 4px;
  padding: 8px 12px;
  color: #FFD700;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 8px;
`;

const PlayheadMarker = styled.div`
  position: absolute;
  width: 2px;
  height: 70px;
  background-color: #ff3333;
  top: 5px;
  left: 50%;
  z-index: 5;
  transform: translateX(-1px);
  pointer-events: none;
  box-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
  
  &::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: #ff3333;
    border-radius: 50%;
    top: -4px;
    left: -3px;
    box-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
  }
`;

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button<{ danger?: boolean }>`
  padding: 6px 12px;
  background: ${props => props.danger ? 'rgba(255, 99, 71, 0.7)' : 'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${props => props.danger ? 'rgba(255, 99, 71, 0.9)' : 'rgba(255, 255, 255, 0.2)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Add a new component for the edit mode toolbar
const EditToolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  height: fit-content;
`;

const ToolButton = styled.button<{ active: boolean }>`
  padding: 8px;
  background: ${props => props.active ? '#1DB954' : 'rgba(0, 0, 0, 0.3)'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  width: 40px;
  height: 40px;
  
  &:hover {
    background: ${props => props.active ? '#1DB954' : 'rgba(255, 255, 255, 0.15)'};
  }
  
  svg {
    width: 20px;
    height: 20px;
  }
`;

const ModeIndicator = styled.div`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: #1DB954;
  white-space: nowrap;
  font-weight: bold;
`;

const TimelineContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0;
  position: relative;
  padding: 20px 0; // Add padding to prevent thumbnail cropping
  overflow: visible; // Allow thumbnails to overflow
`;

const ScrollButton = styled.button<{ direction: string }>`
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0; // Important for flex child
`;

const TimelineEditor: React.FC<TimelineEditorProps> = ({ 
  videoId, 
  duration, 
  beats, 
  downbeats,
  onStepsGenerated,
  currentTime = 0
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [timelineWidth, setTimelineWidth] = useState<number>(1000);
  const [startingDownbeat, setStartingDownbeat] = useState<number | null>(null);
  const [stepStride, setStepStride] = useState<number>(4);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isDraggingMarker, setIsDraggingMarker] = useState<boolean>(false);
  const [draggedMarker, setDraggedMarker] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [stepsGenerated, setStepsGenerated] = useState<boolean>(false);
  const [hasModifiedDownbeats, setHasModifiedDownbeats] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Initialize markers based on beats and downbeats
  useEffect(() => {
    if (beats && beats.length > 0) {
      const newMarkers: Marker[] = [];
      
      // Only add downbeat markers
      if (downbeats && downbeats.length > 0) {
        for (let i = 0; i < downbeats.length; i++) {
          const downbeatTime = downbeats[i];
          newMarkers.push({
            id: `downbeat-${i}`,
            time: downbeatTime,
            isDownbeat: true,
            isCustomized: false
          });
        }
      }
      
      // Sort markers by time
      newMarkers.sort((a, b) => a.time - b.time);
      
      setMarkers(newMarkers);
    }
  }, [beats, downbeats]);
  
  // Calculate timeline width based on duration and zoom
  useEffect(() => {
    const newWidth = Math.max(1000, duration * 100 * zoom);
    setTimelineWidth(newWidth);
  }, [duration, zoom]);
  
  // Calculate position on timeline from time
  const timeToPosition = (time: number): number => {
    return (time / duration) * timelineWidth;
  };
  
  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (currentTime > 0 && timelineScrollRef.current) {
      const playheadPosition = timeToPosition(currentTime);
      const scrollContainer = timelineScrollRef.current;
      const containerWidth = scrollContainer.clientWidth;
      const scrollLeft = scrollContainer.scrollLeft;
      const scrollRight = scrollLeft + containerWidth;
      
      // Only scroll if the playhead is getting close to the edges
      const buffer = containerWidth * 0.2; // 20% buffer from the edge
      
      if (playheadPosition < scrollLeft + buffer) {
        // Playhead approaching left edge, scroll left
        scrollContainer.scrollTo({
          left: Math.max(0, playheadPosition - buffer),
          behavior: 'smooth',
        });
      } else if (playheadPosition > scrollRight - buffer) {
        // Playhead approaching right edge, scroll right
        scrollContainer.scrollTo({
          left: playheadPosition - containerWidth + buffer,
          behavior: 'smooth',
        });
      }
    }
  }, [currentTime, timelineWidth, duration]);
  
  // Update handle timeline click to use the active edit mode
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineContentRef.current) return;
    
    // Calculate the time point based on click position
    const rect = timelineContentRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTimePosition = (clickX / timelineWidth) * duration;
    
    if (editMode === 'add') {
      // Check if the click is too close to an existing marker (prevent duplicates)
      const tooClose = markers.some(marker => 
        Math.abs(marker.time - clickTimePosition) < 0.1
      );
      
      if (!tooClose) {
        // Create a new downbeat marker
        const newMarker: Marker = {
          id: `downbeat-new-${Date.now()}`,
          time: clickTimePosition,
          isDownbeat: true,
          isCustomized: true
        };
        
        // Add to markers and sort
        const updatedMarkers = [...markers, newMarker].sort((a, b) => a.time - b.time);
        setMarkers(updatedMarkers);
        
        // Mark that we've modified the downbeats
        setHasModifiedDownbeats(true);
      }
    }
  };
  
  // Handle marker click based on the edit mode
  const handleMarkerClick = (id: string) => {
    const clickedMarker = markers.find(m => m.id === id);
    if (!clickedMarker) return;
    
    if (editMode === 'delete') {
      // Delete the marker
      const updatedMarkers = markers.filter(m => m.id !== id);
      setMarkers(updatedMarkers);
      
      // Reset starting downbeat if it was deleted
      if (clickedMarker.time === startingDownbeat) {
        setStartingDownbeat(null);
      }
      
      // Mark that we've modified the downbeats
      setHasModifiedDownbeats(true);
      return;
    }
    
    // Handle starting downbeat selection
    if (clickedMarker.isDownbeat) {
      if (clickedMarker.time === startingDownbeat) {
        setStartingDownbeat(null);
      } else {
        setStartingDownbeat(clickedMarker.time);
        
        // Scroll to make this marker visible
        if (timelineScrollRef.current) {
          const pixelPosition = timeToPosition(clickedMarker.time);
          const containerWidth = timelineScrollRef.current.clientWidth;
          timelineScrollRef.current.scrollLeft = pixelPosition - containerWidth / 2;
        }
      }
    }
  };
  
  // Handle marker mouse down event considering the edit mode
  const handleMarkerMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Only proceed with drag if in move mode or no mode is active
    if (editMode !== 'move' && editMode !== 'none') return;
    
    const marker = markers.find(m => m.id === id);
    if (!marker) return;
    
    setIsDraggingMarker(true);
    setDraggedMarker(id);
    setDragStartX(e.clientX);
    
    // Mark the marker as customized since the user is about to move it
    setMarkers(markers.map(m => 
      m.id === id ? { ...m, isCustomized: true } : { ...m, isCustomized: false }
    ));
    
    // Add mouse move and mouse up event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle keyboard events for deleting selected markers
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && draggedMarker) {
      deleteSelectedDownbeat();
    }
  };
  
  // Delete the selected downbeat
  const deleteSelectedDownbeat = () => {
    if (draggedMarker) {
      const updatedMarkers = markers.filter(m => m.id !== draggedMarker);
      setMarkers(updatedMarkers);
      setDraggedMarker(null);
      
      // Reset starting downbeat if it was deleted
      const selectedMarkerObj = markers.find(m => m.id === draggedMarker);
      if (selectedMarkerObj && selectedMarkerObj.time === startingDownbeat) {
        setStartingDownbeat(null);
      }
      
      // Mark that we've modified the downbeats
      setHasModifiedDownbeats(true);
    }
  };

  // Toggle edit mode function
  const toggleEditMode = (mode: EditMode) => {
    if (editMode === mode) {
      setEditMode('none');
    } else {
      setEditMode(mode);
      // Clear selection when changing modes
      setDraggedMarker(null);
      setMarkers(markers.map(m => ({ ...m, isCustomized: false })));
    }
  };
  
  // Instructions text based on the active mode
  const getInstructionsText = () => {
    switch (editMode) {
      case 'delete':
        return 'Click on any downbeat marker to delete it. Click the scissors button again to exit delete mode.';
      case 'add':
        return 'Click anywhere on the timeline to add a new downbeat. Click the plus button again to exit add mode.';
      case 'move':
        return 'Click and drag downbeat markers to reposition them. Click the move button again to exit move mode.';
      case 'move-all':
        return 'Click and drag anywhere on the timeline to move all downbeats together. Click the move all button again to exit mode.';
      default:
        return 'Zoom and pan the timeline to navigate. Click on downbeat markers (green) to select a starting point, then choose your step stride and generate custom dance steps.';
    }
  };
  
  // Render edit mode toolbar
  const renderEditToolbar = () => {
    return (
      <EditToolbar>
        <ToolButton 
          active={editMode === 'delete'} 
          onClick={() => toggleEditMode('delete')}
          title="Delete Downbeats"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,3L13,9L15,11L21,5V3H19M12,12.5A0.5,0.5 0 0,1 11.5,12A0.5,0.5 0 0,1 12,11.5A0.5,0.5 0 0,1 12.5,12A0.5,0.5 0 0,1 12,12.5M6,20A2,2 0 0,1 4,18C4,16.89 4.9,16 6,16A2,2 0 0,1 8,18C8,19.11 7.1,20 6,20M6,8A2,2 0 0,1 4,6C4,4.89 4.9,4 6,4A2,2 0 0,1 8,6C8,7.11 7.1,8 6,8M9.64,7.64C9.87,7.14 10,6.59 10,6A4,4 0 0,0 6,2A4,4 0 0,0 2,6A4,4 0 0,0 6,10C6.59,10 7.14,9.87 7.64,9.64L10,12L7.64,14.36C7.14,14.13 6.59,14 6,14A4,4 0 0,0 2,18A4,4 0 0,0 6,22A4,4 0 0,0 10,18C10,17.41 9.87,16.86 9.64,16.36L12,14L19,21H21V19L9.64,7.64Z" />
          </svg>
          {editMode === 'delete' && <ModeIndicator>Delete Mode</ModeIndicator>}
        </ToolButton>
        
        <ToolButton 
          active={editMode === 'add'} 
          onClick={() => toggleEditMode('add')}
          title="Add Downbeats"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
          {editMode === 'add' && <ModeIndicator>Add Mode</ModeIndicator>}
        </ToolButton>
        
        <ToolButton 
          active={editMode === 'move'} 
          onClick={() => toggleEditMode('move')}
          title="Move Downbeats"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13,11H18L16.5,9.5L17.92,8.08L21.84,12L17.92,15.92L16.5,14.5L18,13H13V18L14.5,16.5L15.92,17.92L12,21.84L8.08,17.92L9.5,16.5L11,18V13H6L7.5,14.5L6.08,15.92L2.16,12L6.08,8.08L7.5,9.5L6,11H11V6L9.5,7.5L8.08,6.08L12,2.16L15.92,6.08L14.5,7.5L13,6V11Z" />
          </svg>
          {editMode === 'move' && <ModeIndicator>Move Mode</ModeIndicator>}
        </ToolButton>

        <ToolButton 
          active={editMode === 'move-all'} 
          onClick={() => toggleEditMode('move-all')}
          title="Move All Downbeats Together"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
          </svg>
          {editMode === 'move-all' && <ModeIndicator>Move All Mode</ModeIndicator>}
        </ToolButton>
      </EditToolbar>
    );
  };
  
  // Handle moving a marker during drag
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingMarker || !draggedMarker || !timelineContentRef.current) return;
    
    const deltaX = e.clientX - dragStartX;
    const pixelsPerSecond = timelineWidth / duration;
    const timeDelta = deltaX / pixelsPerSecond;
    
    // Find the marker being dragged
    const markerIndex = markers.findIndex(m => m.id === draggedMarker);
    if (markerIndex === -1) return;
    
    const updatedMarkers = [...markers];
    const oldTime = updatedMarkers[markerIndex].time;
    let newTime = Math.max(0, Math.min(duration, oldTime + timeDelta));
    
    // Check for stickiness to downbeats (within 0.1s)
    const stickyThreshold = 0.1;
    const downbeatTimes = markers.filter(m => m.isDownbeat && m.id !== draggedMarker).map(m => m.time);
    
    for (const dbTime of downbeatTimes) {
      if (Math.abs(newTime - dbTime) < stickyThreshold) {
        newTime = dbTime;
        break;
      }
    }
    
    // Update the marker position
    updatedMarkers[markerIndex].time = newTime;
    setMarkers(updatedMarkers);
    setDragStartX(e.clientX);
  };
  
  // End drag operation
  const handleMouseUp = () => {
    setIsDraggingMarker(false);
    setDraggedMarker(null);
    
    // Mark that we've modified the downbeats
    setHasModifiedDownbeats(true);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Enhanced generate steps to use the current markers
  const generateSteps = () => {
    if (startingDownbeat === null) {
      alert('Please select a starting downbeat first.');
      return;
    }
    
    // Get all current downbeats from markers
    const allDownbeats = getCurrentDownbeats();
    
    // Find the index of the starting downbeat
    const startIndex = allDownbeats.findIndex(time => Math.abs(time - startingDownbeat) < 0.05);
    if (startIndex === -1) return;
    
    // Generate step markers based on stride
    const newSteps: Step[] = [];
    let currentIndex = startIndex;
    
    while (currentIndex < allDownbeats.length - stepStride) {
      const startTime = allDownbeats[currentIndex];
      const endTime = allDownbeats[currentIndex + stepStride];
      
      newSteps.push({
        start: startTime,
        end: endTime,
        description: `Step ${newSteps.length + 1}`
      });
      
      currentIndex += stepStride;
    }
    
    // Add a final step to the end if possible
    if (currentIndex < allDownbeats.length) {
      const startTime = allDownbeats[currentIndex];
      const endTime = Math.min(duration, startTime + 
        (newSteps.length > 0 ? newSteps[newSteps.length - 1].end - newSteps[newSteps.length - 1].start : 4));
      
      newSteps.push({
        start: startTime,
        end: endTime,
        description: `Step ${newSteps.length + 1}`
      });
    }
    
    setSteps(newSteps);
    setStepsGenerated(true);
    setHasModifiedDownbeats(false);
    
    // Notify parent component
    onStepsGenerated(newSteps);
  };
  
  const resetTimeline = () => {
    // Reset markers to their original state based on downbeats only
    const newMarkers: Marker[] = [];
    
    // Add downbeat markers
    if (downbeats && downbeats.length > 0) {
      for (let i = 0; i < downbeats.length; i++) {
        const downbeatTime = downbeats[i];
        newMarkers.push({
          id: `downbeat-${i}`,
          time: downbeatTime,
          isDownbeat: true,
          isCustomized: false
        });
      }
    }
    
    // Sort markers by time
    newMarkers.sort((a, b) => a.time - b.time);
    
    setMarkers(newMarkers);
    
    // Reset other states
    setStartingDownbeat(null);
    setSteps([]);
    setStepsGenerated(false);
  };
  
  // Format time in mm:ss format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Render tick marks for the timeline ruler
  const renderTimelineTicks = () => {
    const ticks = [];
    const secondsPerTick = zoom < 0.5 ? 10 : zoom < 1 ? 5 : 1;
    const majorTickInterval = zoom < 0.5 ? 60 : zoom < 1 ? 30 : 10;
    
    for (let time = 0; time <= duration; time += secondsPerTick) {
      const isMajorTick = time % majorTickInterval === 0;
      
      ticks.push(
        <TimelineTick 
          key={`tick-${time}`} 
          major={isMajorTick} 
          style={{ left: timeToPosition(time) }}
        />
      );
      
      if (isMajorTick) {
        ticks.push(
          <TimelineLabel 
            key={`label-${time}`} 
            style={{ left: timeToPosition(time) }}
          >
            {formatTime(time)}
          </TimelineLabel>
        );
      }
    }
    
    return ticks;
  };
  
  // Render all beat markers
  const renderMarkers = () => {
    return markers.map(marker => {
      const timestamp = Math.floor(marker.time);
      const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const isStartingBeat = startingDownbeat !== null && Math.abs(marker.time - startingDownbeat) < 0.05;
      
      // Check if marker is in the active section
      const isInActiveSection = steps.length > 0 && currentStep < steps.length && 
        marker.time >= steps[currentStep].start && 
        marker.time <= steps[currentStep].end;

      return (
        <BeatMarker
          key={marker.id}
          isDownbeat={marker.isDownbeat}
          isCustomized={marker.isCustomized}
          dragging={draggedMarker === marker.id}
          isStartingBeat={isStartingBeat}
          isInActiveSection={isInActiveSection}
          style={{ left: timeToPosition(marker.time) }}
          onClick={() => handleMarkerClick(marker.id)}
          onMouseDown={(e) => handleMarkerMouseDown(marker.id, e)}
        >
          {marker.isDownbeat && (
            <ThumbnailPreview>
              <img 
                src={thumbnailUrl} 
                alt={`Timestamp ${formatTime(marker.time)}`}
              />
              <div style={{ 
                position: 'absolute', 
                bottom: 4, 
                left: 4, 
                right: 4, 
                background: 'rgba(0,0,0,0.7)', 
                padding: '2px 4px',
                borderRadius: '2px',
                fontSize: '12px',
                color: 'white',
                textAlign: 'center'
              }}>
                {formatTime(marker.time)}
              </div>
            </ThumbnailPreview>
          )}
        </BeatMarker>
      );
    });
  };
  
  // Render step indicators
  const renderStepIndicators = () => {
    return steps.map((step, index) => {
      const isActive = index === currentStep;
      const baseColor = `hsl(${(index * 30) % 360}, 80%, 60%)`;
      
      return (
        <StepIndicator
          key={`step-${index}`}
          left={timeToPosition(step.start)}
          width={timeToPosition(step.end) - timeToPosition(step.start)}
          color={baseColor}
          isActive={isActive}
          style={{
            opacity: isActive ? 1 : 0.3,
            height: isActive ? '6px' : '4px',
            transform: isActive ? 'translateY(-1px)' : 'none'
          }}
        />
      );
    });
  };
  
  // Render playhead
  const renderPlayhead = () => {
    if (currentTime > 0) {
      return (
        <PlayheadMarker
          style={{ left: timeToPosition(currentTime) }}
        />
      );
    }
    return null;
  };
  
  // Create a method to export the current downbeats for reuse
  const getCurrentDownbeats = (): number[] => {
    return markers
      .filter(m => m.isDownbeat)
      .map(m => m.time)
      .sort((a, b) => a - b);
  };
  
  // Add a function to handle timeline mouse down for move-all mode
  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (editMode !== 'move-all' || !timelineContentRef.current) return;
    
    e.preventDefault();
    setIsDraggingMarker(true);
    setDraggedMarker('all');
    setDragStartX(e.clientX);
    
    // Add mouse move and mouse up event listeners
    document.addEventListener('mousemove', handleMoveAllMouseMove);
    document.addEventListener('mouseup', handleMoveAllMouseUp);
  };

  // Handle move all markers during drag
  const handleMoveAllMouseMove = (e: MouseEvent) => {
    if (!isDraggingMarker || draggedMarker !== 'all' || !timelineContentRef.current) return;
    
    const deltaX = e.clientX - dragStartX;
    const pixelsPerSecond = timelineWidth / duration;
    const timeDelta = deltaX / pixelsPerSecond;
    
    if (Math.abs(timeDelta) < 0.01) return; // Skip tiny movements
    
    // Update all markers by the same time delta
    const updatedMarkers = markers.map(marker => {
      const newTime = Math.max(0, Math.min(duration, marker.time + timeDelta));
      return { ...marker, time: newTime };
    });
    
    setMarkers(updatedMarkers);
    setDragStartX(e.clientX);
    
    // Also update the starting downbeat if it exists
    if (startingDownbeat !== null) {
      const newStartingTime = Math.max(0, Math.min(duration, startingDownbeat + timeDelta));
      setStartingDownbeat(newStartingTime);
    }
  };

  // End move all drag operation
  const handleMoveAllMouseUp = () => {
    setIsDraggingMarker(false);
    setDraggedMarker(null);
    
    // Mark that we've modified the downbeats
    setHasModifiedDownbeats(true);
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleMoveAllMouseMove);
    document.removeEventListener('mouseup', handleMoveAllMouseUp);
  };
  
  // Update the steps rendering in the Timeline component
  const renderSteps = () => {
    return steps.map((step, index) => {
      const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const isActive = index === currentStep;
      
      return (
        <StepSegment
          key={index}
          isActive={isActive}
          onClick={() => handleStepClick(index)}
          title={`${step.description} (${step.start.toFixed(1)}s - ${step.end.toFixed(1)}s)`}
          data-time={`${step.start.toFixed(1)}s - ${step.end.toFixed(1)}s`}
          style={{
            transform: isActive ? 'scale(1.05)' : 'scale(1)',
            zIndex: isActive ? 2 : 1
          }}
        >
          {step.description}
          <ThumbnailPreview>
            <img 
              src={thumbnailUrl} 
              alt={`Step ${index + 1} preview`}
            />
            <div style={{ 
              position: 'absolute', 
              bottom: 4, 
              left: 4, 
              right: 4, 
              background: 'rgba(0,0,0,0.7)', 
              padding: '2px 4px',
              borderRadius: '2px',
              fontSize: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              {formatTime(step.start)} - {formatTime(step.end)}
            </div>
          </ThumbnailPreview>
        </StepSegment>
      );
    });
  };
  
  // Add a function to handle step click
  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };
  
  // Add scrollTimeline function
  const scrollTimeline = (direction: 'left' | 'right') => {
    if (!timelineRef.current) return;
    
    const scrollAmount = timelineRef.current.clientWidth * 0.8;
    const currentScroll = timelineRef.current.scrollLeft;
    
    timelineRef.current.scrollTo({
      left: direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount,
      behavior: 'smooth'
    });
  };
  
  // Update the useEffect for auto-scrolling to keep current step centered
  useEffect(() => {
    if (currentTime > 0 && timelineScrollRef.current) {
      const scrollContainer = timelineScrollRef.current;
      const containerWidth = scrollContainer.clientWidth;
      
      // Calculate the center position
      const centerPosition = containerWidth / 2;
      
      // Scroll to keep the playhead centered
      scrollContainer.scrollLeft = timeToPosition(currentTime) - centerPosition;
    }
  }, [currentTime, timelineWidth, duration]);
  
  // Update useEffect to track current step based on currentTime
  useEffect(() => {
    if (currentTime > 0 && steps.length > 0) {
      // Find the step that contains the current time
      const currentStepIndex = steps.findIndex(
        step => currentTime >= step.start && currentTime <= step.end
      );
      
      if (currentStepIndex !== -1 && currentStepIndex !== currentStep) {
        setCurrentStep(currentStepIndex);
      }
    }
  }, [currentTime, steps]);

  return (
    <div>
      <EditorContainer onKeyDown={handleKeyDown} tabIndex={0}>
        {renderEditToolbar()}
        <MainContent>
          <Instructions>
            {getInstructionsText()}
          </Instructions>
          
          {startingDownbeat !== null && (
            <DownbeatInfoBadge>
              Selected starting downbeat at {formatTime(startingDownbeat)}
            </DownbeatInfoBadge>
          )}
          
          <TimelineControls>
            <ControlGroup>
              <ZoomControl>
                <ControlLabel>Zoom:</ControlLabel>
                <Button onClick={() => setZoom(Math.max(0.2, zoom - 0.2))}>-</Button>
                <span style={{ color: 'white' }}>{Math.round(zoom * 100)}%</span>
                <Button onClick={() => setZoom(Math.min(5, zoom + 0.2))}>+</Button>
              </ZoomControl>
            </ControlGroup>
            
            <ControlGroup>
              <Button onClick={resetTimeline}>Reset Timeline</Button>
            </ControlGroup>
          </TimelineControls>
          
          <TimelineWrapper>
            <TimelineScrollContainer ref={timelineScrollRef}>
              <TimelineContent 
                ref={timelineContentRef}
                width={timelineWidth}
                onClick={handleTimelineClick}
                onMouseDown={handleTimelineMouseDown}
                style={{ 
                  cursor: editMode === 'add' 
                    ? 'copy' 
                    : editMode === 'move-all' 
                      ? 'move' 
                      : 'default' 
                }}
              >
                <TimelineRuler>
                  {renderTimelineTicks()}
                </TimelineRuler>
                
                <MarkersContainer>
                  {renderMarkers()}
                  {renderStepIndicators()}
                  {renderPlayhead()}
                </MarkersContainer>
              </TimelineContent>
            </TimelineScrollContainer>
          </TimelineWrapper>
          
          <StepControls>
            <StepSection>
              <ControlGroup>
                <ControlLabel>Starting Downbeat:</ControlLabel>
                <Select 
                  value={startingDownbeat || ""}
                  onChange={(e) => setStartingDownbeat(e.target.value ? parseFloat(e.target.value) : null)}
                >
                  <option value="">Select a downbeat</option>
                  {markers
                    .filter(m => m.isDownbeat)
                    .map((marker, index) => (
                      <option key={marker.id} value={marker.time}>
                        Downbeat {index + 1} ({formatTime(marker.time)})
                      </option>
                    ))
                  }
                </Select>
              </ControlGroup>
              
              <ControlGroup>
                <ControlLabel>Step Stride:</ControlLabel>
                <Select 
                  value={stepStride}
                  onChange={(e) => setStepStride(parseInt(e.target.value))}
                >
                  <option value={2}>2 Downbeats</option>
                  <option value={4}>4 Downbeats</option>
                  <option value={8}>8 Downbeats</option>
                  <option value={1}>1 Downbeat (Advanced)</option>
                </Select>
              </ControlGroup>
              
              <ControlsGroup>
                <Button
                  variant="primary"
                  onClick={generateSteps}
                  disabled={startingDownbeat === null}
                >
                  {hasModifiedDownbeats ? "Recompute with Modified Beats" : (stepsGenerated ? "Recompute Steps" : "Generate Steps")}
                </Button>
              </ControlsGroup>
            </StepSection>
            
            {steps.length > 0 && (
              <div>
                <Instructions>
                  Generated {steps.length} dance steps based on starting downbeat at {formatTime(startingDownbeat || 0)} 
                  with a stride of {stepStride} {stepStride === 1 ? 'downbeat' : 'downbeats'}.
                  {startingDownbeat && <> You can select a different starting downbeat and click "Recompute Steps" to create new steps.</>}
                  {hasModifiedDownbeats && <div style={{color: '#FFD700', marginTop: '8px'}}>You have modified downbeats. Click "Recompute with Modified Beats" to update steps.</div>}
                </Instructions>
              </div>
            )}
          </StepControls>
        </MainContent>
      </EditorContainer>
    </div>
  );
};

export default TimelineEditor; 