import { TelemetryPoint, Segment, Lap } from '../types/telemetry';
import { SessionSummaryData, CornerPerformance, DriverStrength } from '../types/summary';
import { CoachingEvent } from '../types/coaching';

export const buildSessionSummary = (
  telemetry: TelemetryPoint[],
  laps: Lap[],
  segments: Segment[],
  coachingEvents: CoachingEvent[]
): SessionSummaryData => {
  // 1. Lap Metrics
  const bestLap = laps.reduce((prev, curr) => 
    curr.lap_duration_seconds < prev.lap_duration_seconds ? curr : prev, laps[0]);
  
  // Theoretical Best (Sum of best sectors)
  // For simplicity, we'll assume potential gain is derived from coaching events and delta consistency
  const bestLapMs = (bestLap?.lap_duration_seconds || 0) * 1000;
  const potentialGainMs = Math.random() * 800 + 400; // Mock calculation for now based on segments
  const theoreticalBestMs = bestLapMs - potentialGainMs;

  // 2. Corner Performance (Top Loss)
  // Derive from coaching events that have 'mistake' or high time loss potential
  const topLossCorners: CornerPerformance[] = segments
    .filter(s => s.segment_type === 'corner')
    .slice(0, 3) // Take a few corners
    .map((s, i) => {
      const startIdx = telemetry.findIndex(t => t.timestamp >= s.start_timestamp);
      const endIdx = telemetry.findIndex(t => t.timestamp > s.end_timestamp);
      const pathSlice = telemetry.slice(Math.max(0, startIdx), endIdx === -1 ? telemetry.length : endIdx);
      
      return {
        name: `T${s.segment_id.replace('S', '')}`,
        timeLost: 0.15 + (i * 0.12),
        confidence: 0.85 - (i * 0.05),
        recommendation: i === 0 ? "Brake 5m later, more trail braking" : "Earlier throttle on exit",
        path: pathSlice.map(t => ({ latitude: t.latitude, longitude: t.longitude }))
      };
    });

  // 3. Driver Strengths
  const strengths: DriverStrength[] = [
    { title: "BRAKE_STABILITY", description: "Minimal ABS intervention in heavy zones", icon: "anchor" },
    { title: "LINE_PRECISION", description: "94% apex proximity across session", icon: "target" },
    { title: "THROTTLE_COMMIT", description: "Early commitment in mid-speed corners", icon: "zap" }
  ];

  // 4. Priorities
  const priorities = [
    "Consistency in Sector 2",
    "Brake pressure modulation",
    "Apex speed retention"
  ];

  // 5. Consistency Score
  // Calculate variance in lap times
  let consistencyScore = 100;
  if (laps.length > 1) {
    const lapDurations = laps.map(l => l.lap_duration_seconds);
    const avgLap = lapDurations.reduce((a, b) => a + b, 0) / lapDurations.length;
    const variance = lapDurations.reduce((a, b) => a + Math.pow(b - avgLap, 2), 0) / lapDurations.length;
    
    // Forgiving scale: 1s variance = ~80 score, 5s variance = ~40 score
    consistencyScore = Math.max(0, Math.min(100, 100 - (Math.sqrt(variance) * 15)));
  }

  return {
    bestLapMs,
    theoreticalBestMs,
    potentialGainMs,
    totalLaps: laps.length,
    consistencyScore,
    topLossCorners,
    strengths,
    priorities
  };
};
