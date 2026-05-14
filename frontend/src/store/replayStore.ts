import { create } from 'zustand';
import { ReplayState } from '../types/replay';

export const useReplayStore = create<ReplayState>((set) => ({
  isPlaying: false,
  playbackSpeed: 1.0,
  currentTimestamp: 0,
  sessionStart: 0,
  sessionEnd: 0,
  currentSegmentId: null,
  currentLapNumber: null,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  seekTo: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentTimestamp: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentSegmentId: (id) => set({ currentSegmentId: id }),
  setCurrentLapNumber: (num) => set({ currentLapNumber: num }),
  initializeSession: (start, end) => set({ sessionStart: start, sessionEnd: end, currentTimestamp: start }),
}));
