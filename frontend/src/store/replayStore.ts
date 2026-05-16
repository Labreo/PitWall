import { create } from 'zustand';
import { ReplayState } from '../types/replay';

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useReplayStore = create<ReplayState>((set) => ({
  isPlaying: false,
  playbackSpeed: 1.0,
  currentTimestamp: 0,
  sessionStart: 0,
  sessionEnd: 0,
  currentSegmentId: null,
  currentLapNumber: null,
  ghostModeEnabled: true,
  ghostSource: 'best',
  ghostSelectedLap: 1,
  ghostOffsetMs: 0,
  ghostShowTrail: true,
  activeCoachingEvent: null,
  isSpeechActive: false,
  showBrakingZones: true,
  showCornerAnalytics: true,

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  seekTo: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentTimestamp: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentSegmentId: (id) => set({ currentSegmentId: id }),
  setCurrentLapNumber: (num) => set({ currentLapNumber: num }),
  initializeSession: (start, end) => set({ sessionStart: start, sessionEnd: end, currentTimestamp: start }),
  toggleGhostMode: () => set((state) => ({ ghostModeEnabled: !state.ghostModeEnabled })),
  setGhostSource: (source) => set({ ghostSource: source }),
  setGhostSelectedLap: (lap) => set({ ghostSelectedLap: lap }),
  setGhostOffsetMs: (offset) => set({ ghostOffsetMs: offset }),
  toggleGhostTrail: () => set((state) => ({ ghostShowTrail: !state.ghostShowTrail })),
  toggleBrakingZones: () => set((state) => ({ showBrakingZones: !state.showBrakingZones })),
  toggleCornerAnalytics: () => set((state) => ({ showCornerAnalytics: !state.showCornerAnalytics })),

  setActiveCoachingEvent: (event) => {
    if (dismissTimer) clearTimeout(dismissTimer);
    set({ activeCoachingEvent: event });
    if (event) {
      dismissTimer = setTimeout(() => {
        set({ activeCoachingEvent: null });
        dismissTimer = null;
      }, 5000);
    }
  },

  dismissCoachingEvent: () => {
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
    set({ activeCoachingEvent: null });
  },

  setSpeechActive: (active) => set({ isSpeechActive: active }),
}));
