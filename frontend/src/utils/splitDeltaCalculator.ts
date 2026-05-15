import { SplitTiming } from './splitGenerator';
import { TheoreticalBest } from './theoreticalBestLap';
import { SplitColorStatus } from './splitColorRules';

export interface SplitDeltaResult {
  delta_seconds: number;
  status: SplitColorStatus;
}

/**
 * Calculates the delta and status color for a completed split compared to the best historical split duration.
 * 
 * @param currentSplit The completed split on the current lap
 * @param bestHistoricalDuration The best duration recorded for this segment prior to this split
 * @param isNewBest Whether this split is the new absolute best (equal to or faster than bestHistoricalDuration)
 */
export function calculateSplitDelta(
  currentSplit: SplitTiming,
  bestHistoricalDuration: number | null,
  isNewBest: boolean
): SplitDeltaResult {
  if (bestHistoricalDuration === null) {
    // First time completing this split
    return { delta_seconds: 0, status: 'gold' };
  }

  // Segment delta (current segment duration - historical best segment duration)
  const segmentDelta = currentSplit.duration_seconds - bestHistoricalDuration;

  let status: SplitColorStatus = segmentDelta <= 0 ? 'green' : 'red';

  // Check if gold: New absolute best segment achieved
  if (isNewBest) {
    status = 'gold';
  }

  return {
    delta_seconds: segmentDelta,
    status
  };
}
