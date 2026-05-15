import { SplitTiming } from '../utils/splitGenerator';
import { SplitColorStatus } from '../utils/splitColorRules';

export interface TheoreticalBestState {
  segments: Map<number, { duration: number, lapNumber: number }>;
  totalDuration: number;
  isComplete: boolean;
}

export class TheoreticalBestTracker {
  private bestSegments = new Map<number, { duration: number, lapNumber: number }>();
  private referenceCount: number = 0;

  initialize(referenceCount: number) {
    this.referenceCount = referenceCount;
    this.bestSegments.clear();
  }

  processCompletedSector(splitIndex: number, duration: number, lapNumber: number): boolean {
    const existing = this.bestSegments.get(splitIndex);
    if (!existing || duration < existing.duration) {
      this.bestSegments.set(splitIndex, { duration, lapNumber });
      return true; // Updated
    }
    return false; // Not updated
  }

  getBestDuration(splitIndex: number): number | null {
    return this.bestSegments.get(splitIndex)?.duration ?? null;
  }

  getState(): TheoreticalBestState {
    let total = 0;
    let count = 0;
    
    for (let i = 0; i < this.referenceCount; i++) {
      const best = this.bestSegments.get(i);
      if (best) {
        total += best.duration;
        count++;
      }
    }

    return {
      segments: new Map(this.bestSegments),
      totalDuration: total,
      isComplete: this.referenceCount > 0 && count === this.referenceCount
    };
  }
}

export const theoreticalBestTracker = new TheoreticalBestTracker();
