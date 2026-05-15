import { LapProgressMap, TrackProgressEntry, findSpatialProgress } from './ghostTrackProgress';

/**
 * Core spatial synchronization engine.
 *
 * Given the live car's GPS position, finds:
 * 1. Where the live car is on the reference lap's track spline (spatial progress)
 * 2. The ghost car's position at that same spatial progress
 * 3. The TRUE time delta (ghost timestamp at this track position vs live timestamp)
 *
 * This is the fundamental difference from the old system:
 * OLD: ghost_timestamp = ghost_start + (elapsed / live_duration) * ghost_duration
 *      → Compares TIME proportions (drifts when durations differ)
 * NEW: ghost_timestamp = timestamp_where_ghost_was_at_this_exact_track_position
 *      → Compares SPATIAL positions (stabilizes naturally on matching pace)
 */
export interface SpatialSyncResult {
  /** Ghost's interpolated GPS position at the live car's track progress */
  ghostLat: number;
  ghostLon: number;
  ghostSpeed: number;
  /** Ghost's timestamp when it was at this track position */
  ghostTimestamp: number;
  /** Time delta in milliseconds. Positive = behind ghost (losing), negative = ahead (gaining) */
  deltaMs: number;
  /** Spatial progress of the live car along the reference track (0→1) */
  liveProgress: number;
  /** Meters of spatial separation between the two cars */
  spatialGapM: number;
  /** Whether the driver is currently faster than the ghost at this position */
  trend: 'gaining' | 'losing' | 'neutral';
}

/**
 * Performs the spatial synchronization lookup.
 *
 * @param liveLat - Live car GPS latitude
 * @param liveLon - Live car GPS longitude
 * @param liveTimestamp - Live car absolute timestamp
 * @param liveSpeed - Live car speed km/h
 * @param liveProgressMap - Distance-indexed progress map for the LIVE car's current lap
 * @param ghostProgressMap - Distance-indexed progress map for the GHOST lap
 * @param liveCachedIdx - Mutable cached index for live car progress lookups
 * @param ghostCachedIdx - Mutable cached index for ghost progress lookups
 * @param offsetMs - Visual offset to push ghost ahead
 */
export function synchronizeGhostSpatially(
  liveLat: number,
  liveLon: number,
  liveTimestamp: number,
  liveSpeed: number,
  liveProgressMap: LapProgressMap,
  ghostProgressMap: LapProgressMap,
  liveCachedIdx: { value: number },
  ghostCachedIdx: { value: number },
  offsetMs: number = 0
): SpatialSyncResult | null {
  // 1. Find where the live car is on the LIVE lap's distance spline
  const liveMatch = findSpatialProgress(
    liveLat, liveLon, liveProgressMap, liveCachedIdx
  );
  if (!liveMatch) return null;

  // 2. Find the ghost entry at the SAME spatial progress on the ghost lap
  //    Apply distance offset (convert ms offset to approximate distance offset)
  const targetProgress = liveMatch.progress;

  // Find the ghost entry closest to targetProgress
  const ghostEntries = ghostProgressMap.entries;
  if (ghostEntries.length < 2) return null;

  // Binary-ish search from cached index (spatial progress is monotonically increasing)
  let gIdx = Math.max(0, Math.min(ghostCachedIdx.value, ghostEntries.length - 2));

  // Scan forward if needed
  while (gIdx < ghostEntries.length - 1 && ghostEntries[gIdx + 1].progress <= targetProgress) {
    gIdx++;
  }
  // Scan backward if needed
  while (gIdx > 0 && ghostEntries[gIdx].progress > targetProgress) {
    gIdx--;
  }

  ghostCachedIdx.value = gIdx;

  const g1 = ghostEntries[gIdx];
  const g2 = ghostEntries[Math.min(gIdx + 1, ghostEntries.length - 1)];

  // 3. Interpolate ghost position between g1 and g2
  const progressRange = g2.progress - g1.progress;
  const t = progressRange > 0
    ? Math.max(0, Math.min(1, (targetProgress - g1.progress) / progressRange))
    : 0;

  const ghostLat = g1.latitude + (g2.latitude - g1.latitude) * t;
  const ghostLon = g1.longitude + (g2.longitude - g1.longitude) * t;
  const ghostSpeed = g1.speed_kmh + (g2.speed_kmh - g1.speed_kmh) * t;
  const ghostTimestamp = g1.timestamp + (g2.timestamp - g1.timestamp) * t;

  // 4. TRUE DELTA: Time the live car reached this position minus time the ghost reached it
  //    Positive = live car is slower (behind), Negative = live car is faster (ahead)
  const liveElapsed = liveTimestamp - liveProgressMap.entries[0].timestamp;
  const ghostElapsed = ghostTimestamp - ghostProgressMap.entries[0].timestamp;
  const deltaMs = liveElapsed - ghostElapsed;

  // 5. Spatial gap: direct GPS distance between the two cars
  const dLat = (liveLat - ghostLat) * 111000;
  const dLon = (liveLon - ghostLon) * 111000 * Math.cos(liveLat * Math.PI / 180);
  const spatialGapM = Math.sqrt(dLat * dLat + dLon * dLon);

  // 6. Trend: compare instantaneous speeds at this position
  const speedDiff = liveSpeed - ghostSpeed;
  const trend: 'gaining' | 'losing' | 'neutral' =
    speedDiff > 3 ? 'gaining' : speedDiff < -3 ? 'losing' : 'neutral';

  return {
    ghostLat,
    ghostLon,
    ghostSpeed,
    ghostTimestamp,
    deltaMs,
    liveProgress: liveMatch.progress,
    spatialGapM,
    trend,
  };
}
