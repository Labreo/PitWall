import { TelemetryPoint } from '../types/telemetry';

export function interpolateTelemetry(
  t1: TelemetryPoint,
  t2: TelemetryPoint,
  targetTimestamp: number
): TelemetryPoint {
  const dt = t2.timestamp - t1.timestamp;
  if (dt <= 0) return t1;

  const progress = (targetTimestamp - t1.timestamp) / dt;
  // Clamp progress between 0 and 1 just in case
  const p = Math.max(0, Math.min(1, progress));

  return {
    timestamp: targetTimestamp,
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
}
