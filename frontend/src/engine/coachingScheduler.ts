import { CoachingEvent } from '../types/coaching';
import { coachingAudioQueue } from './coachingAudioQueue';

export class CoachingScheduler {
  private events: CoachingEvent[];
  private lastTimestamp: number = 0;
  private firedIds: Set<string> = new Set();

  constructor(events: CoachingEvent[]) {
    // Pre-sort by timestamp for O(log n) or linear search efficiency
    this.events = [...events].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Called at 60fps from ReplayEngine
   */
  public update(currentTimestamp: number, isPlaying: boolean) {
    if (!isPlaying) {
      // If we pause, we might want to pause audio in the future
      return;
    }

    // Detect scrubbing/restarts
    if (currentTimestamp < this.lastTimestamp || Math.abs(currentTimestamp - this.lastTimestamp) > 1000) {
      this.reset(currentTimestamp);
    }

    // Find events that should fire between lastTimestamp and currentTimestamp
    for (const event of this.events) {
      if (
        event.timestamp <= currentTimestamp &&
        event.timestamp > this.lastTimestamp &&
        !this.firedIds.has(event.id)
      ) {
        this.fireEvent(event);
      }
      
      // Since events are sorted, we can break early
      if (event.timestamp > currentTimestamp) break;
    }

    this.lastTimestamp = currentTimestamp;
  }

  private fireEvent(event: CoachingEvent) {
    this.firedIds.add(event.id);
    coachingAudioQueue.play(event);
  }

  public reset(timestamp: number) {
    // Clear future fired IDs but keep past ones to prevent double-firing on micro-scrubs
    // For a full restart (timestamp near 0), clear everything
    if (timestamp < 1000) {
      this.firedIds.clear();
    } else {
      // Optional: Logic to allow re-firing if scrubbing backward significantly
      this.firedIds.clear(); 
    }
    this.lastTimestamp = timestamp;
  }
}
