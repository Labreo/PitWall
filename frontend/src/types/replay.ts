import { CoachingEvent } from './coaching';
import { GhostSource, GhostOffset } from '../utils/ghostTypes';

export interface ReplayState {
  isPlaying: boolean;
  playbackSpeed: number;
  currentTimestamp: number;
  sessionStart: number;
  sessionEnd: number;
  currentSegmentId: string | null;
  currentLapNumber: number | null;

  // Ghost Lap Mode
  ghostModeEnabled: boolean;
  ghostSource: GhostSource;
  ghostSelectedLap: number;
  ghostOffsetMs: GhostOffset;
  ghostShowTrail: boolean;

  // Coaching
  activeCoachingEvent: CoachingEvent | null;
  isSpeechActive: boolean;

  // Visualization Toggles
  showBrakingZones: boolean;
  showCornerAnalytics: boolean;
  showSummary: boolean;

  // Actions
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (timestamp: number) => void;
  setCurrentTimestamp: (timestamp: number) => void;
  setCurrentSegmentId: (id: string | null) => void;
  setCurrentLapNumber: (num: number | null) => void;
  initializeSession: (start: number, end: number) => void;
  toggleGhostMode: () => void;
  setGhostSource: (source: GhostSource) => void;
  setGhostSelectedLap: (lap: number) => void;
  setGhostOffsetMs: (offset: GhostOffset) => void;
  toggleGhostTrail: () => void;
  setActiveCoachingEvent: (event: CoachingEvent | null) => void;
  dismissCoachingEvent: () => void;
  setSpeechActive: (active: boolean) => void;
  toggleBrakingZones: () => void;
  toggleCornerAnalytics: () => void;
  toggleSummary: () => void;
}
