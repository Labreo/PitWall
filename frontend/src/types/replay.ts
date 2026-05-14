export interface ReplayState {
  isPlaying: boolean;
  playbackSpeed: number;
  currentTimestamp: number;
  sessionStart: number;
  sessionEnd: number;
  currentSegmentId: string | null;
  currentLapNumber: number | null;
  
  // Actions
  togglePlay: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (timestamp: number) => void;
  setCurrentTimestamp: (timestamp: number) => void;
  setCurrentSegmentId: (id: string | null) => void;
  setCurrentLapNumber: (num: number | null) => void;
  initializeSession: (start: number, end: number) => void;
}
