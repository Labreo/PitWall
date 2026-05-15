import { TelemetryPoint, Lap, Segment } from '../types/telemetry';

export interface BrakingPoint {
  longitude: number;
  latitude: number;
  deceleration: number; // Positive value representing loss of speed (km/h per sec)
}

export interface BrakingZone {
  lapNumber: number;
  segmentId: string | null;
  points: BrakingPoint[];
  maxDeceleration: number;
}

/**
 * Analyzes telemetry to identify and extract braking zones across all laps.
 * Deceleration is calculated based on speed differentials.
 */
export function computeBrakingZones(
  telemetry: TelemetryPoint[],
  laps: Lap[],
  segments: Segment[]
): BrakingZone[] {
  if (!telemetry.length || !laps.length) return [];

  const brakingZones: BrakingZone[] = [];
  const DECEL_THRESHOLD = 5.0; // Minimum km/h loss per second to be considered braking
  const MIN_POINTS = 3; // Minimum contiguous points to form a zone

  laps.forEach(lap => {
    // Extract telemetry for this lap
    const lapPts = telemetry.filter(
      t => t.timestamp >= lap.start_timestamp && t.timestamp <= lap.end_timestamp
    );

    let currentZone: BrakingPoint[] = [];
    let currentMaxDecel = 0;

    for (let i = 1; i < lapPts.length; i++) {
      const prev = lapPts[i - 1];
      const curr = lapPts[i];
      
      const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds
      if (dt <= 0) continue;

      const dv = prev.speed_kmh - curr.speed_kmh;
      const deceleration = dv / dt;

      if (deceleration > DECEL_THRESHOLD) {
        currentZone.push({
          longitude: curr.longitude,
          latitude: curr.latitude,
          deceleration
        });
        currentMaxDecel = Math.max(currentMaxDecel, deceleration);
      } else {
        // End of braking zone
        if (currentZone.length >= MIN_POINTS) {
          // Find which segment this braking zone belongs to
          const midPointTs = lapPts[i - Math.floor(currentZone.length / 2)].timestamp;
          const matchingSegment = segments.find(
            s => midPointTs >= s.start_timestamp && midPointTs <= s.end_timestamp
          );

          brakingZones.push({
            lapNumber: lap.lap_number,
            segmentId: matchingSegment ? matchingSegment.segment_id : null,
            points: currentZone,
            maxDeceleration: currentMaxDecel
          });
        }
        currentZone = [];
        currentMaxDecel = 0;
      }
    }

    // Capture zone if lap ends while braking
    if (currentZone.length >= MIN_POINTS) {
      brakingZones.push({
        lapNumber: lap.lap_number,
        segmentId: null,
        points: currentZone,
        maxDeceleration: currentMaxDecel
      });
    }
  });

  return brakingZones;
}
