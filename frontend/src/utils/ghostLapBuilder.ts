import { TelemetryPoint, Lap } from '../types/telemetry';
import { GhostLapData, GhostSource } from './ghostTypes';

/**
 * Precomputes ghost lap data for each available comparison source.
 * All slicing and sorting happens once at initialization — zero runtime cost.
 */
export function buildGhostLaps(
  telemetry: TelemetryPoint[],
  laps: Lap[]
): Map<number, GhostLapData> {
  const ghostMap = new Map<number, GhostLapData>();
  if (!telemetry.length || !laps.length) return ghostMap;

  laps.forEach(lap => {
    const slice = telemetry.filter(
      t => t.timestamp >= lap.start_timestamp && t.timestamp <= lap.end_timestamp
    );
    if (slice.length < 2) return;

    ghostMap.set(lap.lap_number, {
      source: 'selected',
      lap,
      telemetry: slice,
      label: `Lap ${lap.lap_number}`,
    });
  });

  return ghostMap;
}

/**
 * Returns the best lap (shortest duration) from the set.
 */
export function findBestLap(laps: Lap[]): Lap | null {
  if (!laps.length) return null;
  return [...laps].sort((a, b) => a.lap_duration_seconds - b.lap_duration_seconds)[0];
}

/**
 * Builds a theoretical best lap by stitching the fastest sector times
 * from across all laps. Returns the composite telemetry slice.
 */
export function buildTheoreticalBest(
  telemetry: TelemetryPoint[],
  laps: Lap[],
  segments: { segment_id: string; start_timestamp: number; end_timestamp: number }[]
): GhostLapData | null {
  if (laps.length < 2 || !segments.length) return null;

  // Group segments by segment_id across laps
  const segGroups = new Map<string, { lap: Lap; start: number; end: number; duration: number }[]>();

  segments.forEach(seg => {
    const parentLap = laps.find(l => seg.start_timestamp >= l.start_timestamp && seg.end_timestamp <= l.end_timestamp);
    if (!parentLap) return;

    if (!segGroups.has(seg.segment_id)) segGroups.set(seg.segment_id, []);
    segGroups.get(seg.segment_id)!.push({
      lap: parentLap,
      start: seg.start_timestamp,
      end: seg.end_timestamp,
      duration: seg.end_timestamp - seg.start_timestamp,
    });
  });

  // Pick the fastest instance of each segment
  const bestSegments: { start: number; end: number }[] = [];
  segGroups.forEach(instances => {
    const fastest = instances.sort((a, b) => a.duration - b.duration)[0];
    if (fastest) bestSegments.push({ start: fastest.start, end: fastest.end });
  });

  // Sort chronologically by the first occurrence
  bestSegments.sort((a, b) => a.start - b.start);

  // Stitch telemetry from these segments
  const stitchedTelemetry: TelemetryPoint[] = [];
  let timeOffset = 0;

  bestSegments.forEach((seg, i) => {
    const slice = telemetry.filter(t => t.timestamp >= seg.start && t.timestamp <= seg.end);
    const segDuration = seg.end - seg.start;

    slice.forEach((pt, j) => {
      const relativeTime = pt.timestamp - seg.start;
      stitchedTelemetry.push({
        ...pt,
        timestamp: timeOffset + relativeTime,
      });
    });
    timeOffset += segDuration;
  });

  if (stitchedTelemetry.length < 2) return null;

  return {
    source: 'theoretical',
    lap: {
      lap_number: -1,
      start_timestamp: stitchedTelemetry[0].timestamp,
      end_timestamp: stitchedTelemetry[stitchedTelemetry.length - 1].timestamp,
      lap_duration_seconds: timeOffset / 1000,
    },
    telemetry: stitchedTelemetry,
    label: 'Theoretical Best',
  };
}
