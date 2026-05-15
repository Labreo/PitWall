import { TelemetryPoint } from '../types/telemetry';
import { GhostLapData } from './ghostTypes';

/**
 * Performs a binary-search-accelerated interpolation of the ghost's position
 * at a given progress ratio (0..1) through the ghost lap.
 * Uses a mutable cachedIndex for O(1) amortized lookups during sequential playback.
 */
export function interpolateGhostPosition(
  ghostLap: GhostLapData,
  progress: number,
  offsetMs: number,
  cachedIndex: { value: number }
): { point: TelemetryPoint; deltaMs: number } | null {
  const telem = ghostLap.telemetry;
  if (telem.length < 2) return null;

  const lapStart = ghostLap.lap.start_timestamp;
  const lapEnd = ghostLap.lap.end_timestamp;
  const lapDuration = lapEnd - lapStart;

  // Target timestamp with offset applied (offset pushes ghost ahead visually)
  const targetTs = lapStart + (progress * lapDuration) + offsetMs;

  if (targetTs < lapStart || targetTs > lapEnd) return null;

  // Scan from cached index (amortized O(1) for sequential access)
  let idx = Math.max(0, Math.min(cachedIndex.value, telem.length - 2));

  while (idx < telem.length - 1 && telem[idx + 1].timestamp <= targetTs) {
    idx++;
  }
  while (idx > 0 && telem[idx].timestamp > targetTs) {
    idx--;
  }

  cachedIndex.value = idx;

  const t1 = telem[idx];
  const t2 = telem[Math.min(idx + 1, telem.length - 1)];

  const dt = t2.timestamp - t1.timestamp;
  const p = dt > 0 ? Math.max(0, Math.min(1, (targetTs - t1.timestamp) / dt)) : 0;

  const point: TelemetryPoint = {
    timestamp: targetTs,
    latitude: t1.latitude + (t2.latitude - t1.latitude) * p,
    longitude: t1.longitude + (t2.longitude - t1.longitude) * p,
    altitude: t1.altitude + (t2.altitude - t1.altitude) * p,
    speed_kmh: t1.speed_kmh + (t2.speed_kmh - t1.speed_kmh) * p,
    accel_x: t1.accel_x + (t2.accel_x - t1.accel_x) * p,
    accel_y: t1.accel_y + (t2.accel_y - t1.accel_y) * p,
    accel_z: t1.accel_z + (t2.accel_z - t1.accel_z) * p,
    gyro_x: t1.gyro_x + (t2.gyro_x - t1.gyro_x) * p,
    gyro_y: t1.gyro_y + (t2.gyro_y - t1.gyro_y) * p,
    gyro_z: t1.gyro_z + (t2.gyro_z - t1.gyro_z) * p,
  };

  // Delta: how far the ghost is ahead/behind in time relative to proportional progress
  const ghostElapsed = targetTs - lapStart;
  const currentElapsed = progress * lapDuration;
  const deltaMs = currentElapsed - ghostElapsed;

  return { point, deltaMs };
}
