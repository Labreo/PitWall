import { Lap, Segment } from '../types/telemetry';
import { buildLapSplits } from './splitGenerator';

export interface TheoreticalBest {
  segments: {
    segment_id: string;
    best_duration_seconds: number;
    lap_number: number;
  }[];
  total_theoretical_seconds: number;
  is_complete: boolean;
}

/**
 * Precomputes the theoretical best lap by finding the minimum duration
 * for each unique split segment across all laps.
 */
export function buildTheoreticalBestLap(laps: Lap[], segments: Segment[]): TheoreticalBest {
  const lapSplitsMap = buildLapSplits(laps, segments);
  const segmentBests = new Map<string, { duration: number, lapNumber: number }>();

  // Assign segments to laps and find best times
  for (const [lapNumber, lapSplits] of lapSplitsMap.entries()) {
    for (const split of lapSplits.splits) {
      const existing = segmentBests.get(split.segment_id);
      if (!existing || split.duration_seconds < existing.duration) {
        segmentBests.set(split.segment_id, {
          duration: split.duration_seconds,
          lapNumber: lapNumber
        });
      }
    }
  }

  if (laps.length === 0) return { segments: [], total_theoretical_seconds: 0, is_complete: false };
  
  // Use Lap 1 splits as the reference layout
  const refSplits = lapSplitsMap.get(laps[0].lap_number)?.splits || [];

  const bestSegments: { segment_id: string; best_duration_seconds: number; lap_number: number }[] = [];
  let total = 0;

  for (const refSplit of refSplits) {
    const best = segmentBests.get(refSplit.segment_id);
    if (best) {
      bestSegments.push({
        segment_id: refSplit.segment_id,
        best_duration_seconds: best.duration,
        lap_number: best.lapNumber,
      });
      total += best.duration;
    }
  }

  return {
    segments: bestSegments,
    total_theoretical_seconds: total,
    is_complete: bestSegments.length > 0 && bestSegments.length === refSplits.length,
  };
}
