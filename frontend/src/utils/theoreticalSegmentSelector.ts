import { Segment, Lap, TelemetryPoint } from '../types/telemetry';

export interface TheoreticalSector {
  segmentId: string;
  bestSegment: Segment;
  lapNumber: number;
}

/**
 * Identifies the best version of each track segment across the entire session.
 * Assumes segments repeat in a pattern every lap.
 */
export const selectBestSegments = (
  telemetry: TelemetryPoint[],
  laps: Lap[],
  segments: Segment[]
): TheoreticalSector[] => {
  // 1. Map segments to laps
  const segmentsWithLaps = segments.map(seg => {
    const lap = laps.find(l => seg.start_timestamp >= l.start_timestamp && seg.end_timestamp <= l.end_timestamp);
    return { seg, lapNumber: lap?.lap_number || 0 };
  }).filter(item => item.lapNumber > 0); // Ignore out-of-lap segments

  // 2. Pre-calculate geographic centers for all segments to enable spatial matching
  const getSegmentCenter = (seg: Segment) => {
    const startIdx = telemetry.findIndex(t => t.timestamp >= seg.start_timestamp);
    const endIdx = telemetry.findIndex(t => t.timestamp > seg.end_timestamp);
    const slice = telemetry.slice(Math.max(0, startIdx), endIdx === -1 ? telemetry.length : endIdx);
    if (slice.length === 0) return { lat: 0, lon: 0 };
    
    const sumLat = slice.reduce((a, b) => a + b.latitude, 0);
    const sumLon = slice.reduce((a, b) => a + b.longitude, 0);
    return { lat: sumLat / slice.length, lon: sumLon / slice.length };
  };

  const segmentsByLap: Record<number, { seg: Segment, center: { lat: number, lon: number } }[]> = {};
  segmentsWithLaps.forEach(item => {
    if (!segmentsByLap[item.lapNumber]) segmentsByLap[item.lapNumber] = [];
    segmentsByLap[item.lapNumber].push({ 
      seg: item.seg, 
      center: getSegmentCenter(item.seg) 
    });
  });

  const lapNumbers = Object.keys(segmentsByLap).map(Number).sort((a, b) => a - b);
  if (lapNumbers.length === 0) return [];

  // Pick the lap with the most segments as the geographic template
  const refLapNum = lapNumbers.reduce((prev, curr) => 
    segmentsByLap[curr].length > segmentsByLap[prev].length ? curr : prev
  );
  
  const referenceSegments = [...segmentsByLap[refLapNum]].sort((a, b) => a.seg.start_timestamp - b.seg.start_timestamp);

  // 3. For each segment in the reference lap, find the fastest SPATIAL match across ALL laps
  const bestSectors: TheoreticalSector[] = referenceSegments.map((ref, index) => {
    let bestSeg = ref.seg;
    let bestLap = refLapNum;

    lapNumbers.forEach(ln => {
      // Find the segment in this lap that is geographically closest to our reference segment
      const candidates = segmentsByLap[ln];
      let closest = candidates[0];
      let minDistance = Infinity;

      candidates.forEach(cand => {
        const dist = Math.sqrt(
          Math.pow(cand.center.lat - ref.center.lat, 2) + 
          Math.pow(cand.center.lon - ref.center.lon, 2)
        );
        if (dist < minDistance) {
          minDistance = dist;
          closest = cand;
        }
      });

      // Spatial validation: must be reasonably close and same type
      const SPATIAL_THRESHOLD = 0.0005; // ~50m threshold for Donington
      if (closest && 
          minDistance < SPATIAL_THRESHOLD &&
          closest.seg.segment_type === ref.seg.segment_type && 
          closest.seg.duration_seconds < bestSeg.duration_seconds) {
        bestSeg = closest.seg;
        bestLap = ln;
      }
    });

    return {
      segmentId: `Sector_${index + 1}`,
      bestSegment: bestSeg,
      lapNumber: bestLap
    };
  });

  return bestSectors;
};
