export type SplitEventType = 'sector_enter' | 'sector_exit' | 'lap_complete' | 'lap_enter';

export interface SplitEvent {
  type: SplitEventType;
  timestamp: number;
  lapNumber: number;
  segmentId?: string;
  duration?: number;
}

type SplitEventHandler = (event: SplitEvent) => void;

class SplitEventBus {
  private listeners: SplitEventHandler[] = [];

  subscribe(handler: SplitEventHandler) {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter(h => h !== handler);
    };
  }

  emit(event: SplitEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  clear() {
    this.listeners = [];
  }
}

export const splitEventBus = new SplitEventBus();
