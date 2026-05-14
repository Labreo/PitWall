import { CoachingEvent } from './coaching';

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

  // Coaching
  activeCoachingEvent: CoachingEvent | null;
  isSpeechActive: boolean;

  // Actions
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (timestamp: number) => void;
  setCurrentTimestamp: (timestamp: number) => void;
  setCurrentSegmentId: (id: string | null) => void;
  setCurrentLapNumber: (num: number | null) => void;
  initializeSession: (start: number, end: number) => void;
  toggleGhostMode: () => void;
  setActiveCoachingEvent: (event: CoachingEvent | null) => void;
  dismissCoachingEvent: () => void;
  setSpeechActive: (active: boolean) => void;
}
