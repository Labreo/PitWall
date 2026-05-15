import { SplitColorStatus } from '../utils/splitColorRules';

export interface SplitDeltaResult {
  delta_seconds: number;
  status: SplitColorStatus;
}

export function evaluateSectorDelta(
  duration: number,
  bestHistoricalDuration: number | null,
  isNewBest: boolean
): SplitDeltaResult {
  if (bestHistoricalDuration === null) {
    return { delta_seconds: 0, status: 'gold' };
  }

  const segmentDelta = duration - bestHistoricalDuration;
  let status: SplitColorStatus = segmentDelta <= 0 ? 'green' : 'red';

  if (isNewBest) {
    status = 'gold';
  }

  return { delta_seconds: segmentDelta, status };
}
