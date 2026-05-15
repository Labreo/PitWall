import { Lap, Segment } from '../types/telemetry';

export interface SplitTiming {
  segment_id: string;
  split_index: number;
  name: string; // e.g. "Sector 1", "Turn 4"
  start_timestamp: number;
  end_timestamp: number;
  duration_seconds: number;
  cumulative_time_seconds: number;
  is_corner: boolean;
}

export interface LapSplits {
  lap_number: number;
  splits: SplitTiming[];
  total_duration_seconds: number;
}

/**
 * Generates the splits for each lap based on segments.
 */
export function buildLapSplits(laps: Lap[], segments: Segment[]): Map<number, LapSplits> {
  const lapSplitsMap = new Map<number, LapSplits>();

  for (const lap of laps) {
    // Find segments that fall within this lap
    const lapSegments = segments.filter(
      s => s.start_timestamp >= lap.start_timestamp && s.end_timestamp <= lap.end_timestamp
    ).sort((a, b) => a.start_timestamp - b.start_timestamp);

    const splits: SplitTiming[] = [];
    let previousEndTs = lap.start_timestamp;

    lapSegments.forEach((seg, i) => {
      // For speedrun style splits, the split ends when the segment ends.
      // The cumulative time is the total time elapsed from the lap start to this segment's end.
      const cumulative_seconds = (seg.end_timestamp - lap.start_timestamp) / 1000;
      const duration_seconds = (seg.end_timestamp - previousEndTs) / 1000;
      
      splits.push({
        segment_id: seg.segment_id,
        split_index: i,
        name: seg.segment_type === 'corner' ? `Turn ${i+1}` : `Straight ${i+1}`,
        start_timestamp: previousEndTs,
        end_timestamp: seg.end_timestamp,
        duration_seconds: duration_seconds,
        cumulative_time_seconds: cumulative_seconds,
        is_corner: seg.segment_type === 'corner'
      });
      
      previousEndTs = seg.end_timestamp;
    });

    lapSplitsMap.set(lap.lap_number, {
      lap_number: lap.lap_number,
      splits,
      total_duration_seconds: lap.lap_duration_seconds,
    });
  }

  return lapSplitsMap;
}
