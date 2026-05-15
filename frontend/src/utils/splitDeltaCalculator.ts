import { SplitTiming } from './splitGenerator';
import { TheoreticalBest } from './theoreticalBestLap';
import { SplitColorStatus } from './splitColorRules';

export interface SplitDeltaResult {
  delta_seconds: number;
  status: SplitColorStatus;
}

/**
 * Calculates the delta and status color for a completed split compared to a reference lap and theoretical best.
 * 
 * @param currentSplit The completed split on the current lap
 * @param referenceSplit The corresponding split on the reference (PB) lap
 * @param theoreticalBest The theoretical best lap data
 */
export function calculateSplitDelta(
  currentSplit: SplitTiming,
  referenceSplit: SplitTiming | undefined,
  theoreticalBest: TheoreticalBest | null
): SplitDeltaResult {
  if (!referenceSplit) {
    return { delta_seconds: 0, status: 'neutral' };
  }

  // Cumulative delta (current cumulative - reference cumulative)
  // Negative means ahead of PB, Positive means behind PB
  const cumulativeDelta = currentSplit.cumulative_time_seconds - referenceSplit.cumulative_time_seconds;
  const isAhead = cumulativeDelta < 0;

  // Segment delta (current segment duration - reference segment duration)
  const segmentDelta = currentSplit.duration_seconds - referenceSplit.duration_seconds;
  const gainedTime = segmentDelta < 0;

  let status: SplitColorStatus = isAhead ? 'green' : 'red';

  // Check if blue: Ahead of PB pace AND gained time during this specific segment
  if (isAhead && gainedTime) {
    status = 'blue';
  }

  // Check if gold: New absolute best segment achieved
  if (theoreticalBest) {
    const theoSeg = theoreticalBest.segments.find(s => s.segment_id === currentSplit.segment_id);
    // If the current duration is equal to or faster than the theoretical best
    // (using a tiny epsilon for float comparison)
    if (theoSeg && currentSplit.duration_seconds <= theoSeg.best_duration_seconds + 0.001) {
      status = 'gold';
    }
  }

  return {
    delta_seconds: cumulativeDelta,
    status
  };
}
