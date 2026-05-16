import { theoreticalBestTracker, TheoreticalBestState } from './theoreticalBestTracker';
import { SplitColorStatus } from '../utils/splitColorRules';
import { evaluateSectorDelta } from './splitComparator';
import { Lap, Segment } from '../types/telemetry';
import { buildLapSplits, LapSplits, SplitTiming } from '../utils/splitGenerator';

export interface CompletedSectorResult {
  segment_id: string;
  split_index: number;
  duration_seconds: number;
  delta_seconds: number;
  status: SplitColorStatus;
  lap_number: number;
  cumulative_time_seconds: number;
}

type StateMachineListener = () => void;

class SplitStateMachine {
  private listeners: StateMachineListener[] = [];
  
  // Static Map of all splits for the session
  private sessionSplitsMap = new Map<number, LapSplits>();
  
  // Current active state
  private activeLapNumber: number | null = null;
  private activeSegmentId: string | null = null;
  
  // Processed History
  private completedSectorsByLap = new Map<number, CompletedSectorResult[]>();
  private lastProcessedTimestamp: number = -1;

  subscribe(listener: StateMachineListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  initialize(laps: Lap[], segments: Segment[]) {
    this.sessionSplitsMap = buildLapSplits(laps, segments);
    
    const refSplits = this.sessionSplitsMap.get(1)?.splits || [];
    theoreticalBestTracker.initialize(refSplits.length);
    
    this.completedSectorsByLap.clear();
    this.activeLapNumber = null;
    this.activeSegmentId = null;
    this.lastProcessedTimestamp = -1;
    this.notify();
  }

  processToTimestamp(timestamp: number) {
    // Optimization: If timestamp is just moving forward incrementally, 
    // we only do a full re-evaluation if it's a "jump" (scrubbing)
    const isForward = timestamp >= this.lastProcessedTimestamp && timestamp < this.lastProcessedTimestamp + 1000;
    const isJump = !isForward;

    if (!isJump && this.activeLapNumber !== null) {
      // In normal forward playback, we just check the current active segment's end
      this.incrementalUpdate(timestamp);
      this.lastProcessedTimestamp = timestamp;
      return;
    }

    // 1. Snapshot previous state for change detection
    const prevLap = this.activeLapNumber;
    const prevSegment = this.activeSegmentId;
    const prevTheoBest = theoreticalBestTracker.getState().totalDuration;
    let prevCompletedCount = 0;
    this.completedSectorsByLap.forEach(list => prevCompletedCount += list.length);

    // 2. Reset dynamic state for a clean linear re-evaluation
    const refSplits = this.sessionSplitsMap.get(1)?.splits || [];
    theoreticalBestTracker.initialize(refSplits.length);
    this.completedSectorsByLap.clear();
    this.activeLapNumber = null;
    this.activeSegmentId = null;

    // 3. Play forward linearly through all laps up to timestamp
    let lastValidLap: number | null = null;

    for (const [lapNumber, lapSplits] of this.sessionSplitsMap.entries()) {
      if (timestamp < lapSplits.splits[0]?.start_timestamp) break;

      this.activeLapNumber = lapNumber;
      lastValidLap = lapNumber;

      const completedResults: CompletedSectorResult[] = [];

      for (const split of lapSplits.splits) {
        if (timestamp < split.start_timestamp) break;

        this.activeSegmentId = split.segment_id;

        if (timestamp >= split.end_timestamp) {
          const bestBefore = theoreticalBestTracker.getBestDuration(split.split_index);
          const isNewBest = theoreticalBestTracker.processCompletedSector(
            split.split_index, 
            split.duration_seconds, 
            lapNumber
          );
          
          const result = evaluateSectorDelta(split.duration_seconds, bestBefore, isNewBest);
          
          completedResults.push({
            segment_id: split.segment_id,
            split_index: split.split_index,
            duration_seconds: split.duration_seconds,
            delta_seconds: result.delta_seconds,
            status: result.status,
            lap_number: lapNumber,
            cumulative_time_seconds: split.cumulative_time_seconds
          });
          
          this.activeSegmentId = null; 
        } else {
          break; 
        }
      }

      if (completedResults.length > 0) {
        this.completedSectorsByLap.set(lapNumber, completedResults);
      }
      
      if (this.activeSegmentId !== null) break;
    }

    if (this.activeLapNumber === null) this.activeLapNumber = lastValidLap;
    
    // 4. Only notify if meaningful state changed
    const newTheoBest = theoreticalBestTracker.getState().totalDuration;
    let newCompletedCount = 0;
    this.completedSectorsByLap.forEach(list => newCompletedCount += list.length);

    this.lastProcessedTimestamp = timestamp;

    if (
      this.activeLapNumber !== prevLap || 
      this.activeSegmentId !== prevSegment ||
      newTheoBest !== prevTheoBest ||
      newCompletedCount !== prevCompletedCount
    ) {
      this.notify();
    }
  }

  private incrementalUpdate(timestamp: number) {
    if (this.activeLapNumber === null) return;
    const lapSplits = this.sessionSplitsMap.get(this.activeLapNumber);
    if (!lapSplits) return;

    let changed = false;

    for (const split of lapSplits.splits) {
      // Find the segment we are currently in or ahead of
      if (timestamp < split.start_timestamp) break;

      if (timestamp >= split.end_timestamp) {
        // Did we just finish this? Check if it's already in completed list
        const lapCompleted = this.completedSectorsByLap.get(this.activeLapNumber) || [];
        if (!lapCompleted.some(c => c.segment_id === split.segment_id)) {
          const bestBefore = theoreticalBestTracker.getBestDuration(split.split_index);
          const isNewBest = theoreticalBestTracker.processCompletedSector(
            split.split_index, 
            split.duration_seconds, 
            this.activeLapNumber
          );
          
          const result = evaluateSectorDelta(split.duration_seconds, bestBefore, isNewBest);
          
          lapCompleted.push({
            segment_id: split.segment_id,
            split_index: split.split_index,
            duration_seconds: split.duration_seconds,
            delta_seconds: result.delta_seconds,
            status: result.status,
            lap_number: this.activeLapNumber,
            cumulative_time_seconds: split.cumulative_time_seconds
          });
          
          this.completedSectorsByLap.set(this.activeLapNumber, lapCompleted);
          changed = true;
        }
      } else {
        // We are currently IN this split
        if (this.activeSegmentId !== split.segment_id) {
          this.activeSegmentId = split.segment_id;
          changed = true;
        }
        break;
      }
    }

    // Check for lap transition
    if (timestamp > lapSplits.splits[lapSplits.splits.length - 1].end_timestamp) {
      const nextLap = this.sessionSplitsMap.get(this.activeLapNumber + 1);
      if (nextLap && timestamp >= nextLap.splits[0].start_timestamp) {
        this.activeLapNumber++;
        this.activeSegmentId = nextLap.splits[0].segment_id;
        changed = true;
      }
    }

    if (changed) this.notify();
  }

  // Getters for React UI to consume
  getTheoreticalBest(): TheoreticalBestState {
    return theoreticalBestTracker.getState();
  }

  getActiveState() {
    return {
      activeLapNumber: this.activeLapNumber,
      activeSegmentId: this.activeSegmentId,
    };
  }

  getCompletedSectorsForLap(lapNumber: number): CompletedSectorResult[] {
    return this.completedSectorsByLap.get(lapNumber) || [];
  }
  
  getLapSplits(lapNumber: number): LapSplits | undefined {
    return this.sessionSplitsMap.get(lapNumber);
  }

  getHistoricalBestForSegment(splitIndex: number): number | null {
    return theoreticalBestTracker.getBestDuration(splitIndex);
  }
}

export const splitStateMachine = new SplitStateMachine();
