import { create } from 'zustand';
import { ReplayState } from '../types/replay';

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useReplayStore = create<ReplayState>((set, get) => ({
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
  showSummary: false,
  theoreticalLapData: null,
  isTheoreticalReplayActive: false,
  initialTelemetry: [],
  initialLaps: [],
  initialSegments: [],

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  seekTo: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentTimestamp: (timestamp) => set({ currentTimestamp: timestamp }),
  setCurrentSegmentId: (id) => set({ currentSegmentId: id }),
  setCurrentLapNumber: (num) => set({ currentLapNumber: num }),
  
  initializeSession: (telemetry, laps, segments) => {
    const start = telemetry[0]?.timestamp || 0;
    const end = telemetry[telemetry.length - 1]?.timestamp || 0;
    set({ 
      initialTelemetry: telemetry,
      initialLaps: laps,
      initialSegments: segments,
      sessionStart: start,
      sessionEnd: end,
      currentTimestamp: start,
      isTheoreticalReplayActive: false
    });
  },

  resetToNormalReplay: () => {
    const { initialTelemetry } = get();
    const start = initialTelemetry[0]?.timestamp || 0;
    const end = initialTelemetry[initialTelemetry.length - 1]?.timestamp || 0;
    set({
      isTheoreticalReplayActive: false,
      sessionStart: start,
      sessionEnd: end,
      currentTimestamp: start,
      isPlaying: true
    });
  },

  startTheoreticalReplay: () => {
    const { theoreticalLapData } = get();
    if (!theoreticalLapData) return;
    
    set({
      isTheoreticalReplayActive: true,
      sessionStart: 0,
      sessionEnd: theoreticalLapData.totalDurationMs,
      currentTimestamp: 0,
      isPlaying: true
    });
  },

  setTheoreticalLapData: (data) => set({ theoreticalLapData: data }),
  setTheoreticalReplayActive: (active) => set({ isTheoreticalReplayActive: active }),
  toggleGhostMode: () => set((state) => ({ ghostModeEnabled: !state.ghostModeEnabled })),
  setGhostSource: (source) => set({ ghostSource: source }),
  setGhostSelectedLap: (lap) => set({ ghostSelectedLap: lap }),
  setGhostOffsetMs: (offset) => set({ ghostOffsetMs: offset }),
  toggleGhostTrail: () => set((state) => ({ ghostShowTrail: !state.ghostShowTrail })),
  toggleBrakingZones: () => set((state) => ({ showBrakingZones: !state.showBrakingZones })),
  toggleCornerAnalytics: () => set((state) => ({ showCornerAnalytics: !state.showCornerAnalytics })),
  toggleSummary: () => set((state) => ({ showSummary: !state.showSummary })),

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
