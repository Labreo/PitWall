import { create } from 'zustand';
import { CoachingEvent } from '../types/coaching';

interface CoachingState {
  activeEvent: CoachingEvent | null;
  queue: CoachingEvent[];
  playbackStatus: 'idle' | 'playing' | 'interrupted';
  
  // Actions
  setActiveEvent: (event: CoachingEvent | null) => void;
  addToQueue: (event: CoachingEvent) => void;
  clearActive: () => void;
  setPlaybackStatus: (status: 'idle' | 'playing' | 'interrupted') => void;
}

export const useCoachingStore = create<CoachingState>((set) => ({
  activeEvent: null,
  queue: [],
  playbackStatus: 'idle',

  setActiveEvent: (event) => set({ activeEvent: event }),
  addToQueue: (event) => set((state) => ({ queue: [...state.queue, event] })),
  clearActive: () => set({ activeEvent: null, playbackStatus: 'idle' }),
  setPlaybackStatus: (status) => set({ playbackStatus: status }),
}));
