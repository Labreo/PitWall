import { TelemetryPoint } from '../types/telemetry';

const G = 9.80665; // m/s²

/**
 * Precomputes derived G-force values for every telemetry point.
 * 
 * Since the raw accelerometer data is zero (no IMU in the data source),
 * we derive G-forces from GPS position and speed:
 * 
 * - Longitudinal G (accel_x): From speed change over time (braking/acceleration)
 * - Lateral G (accel_y): From heading change × speed (cornering force)
 * 
 * The results are written directly into the telemetry array's accel_x/accel_y fields.
 * Called once at data load — zero runtime cost.
 */
export function deriveGForces(telemetry: TelemetryPoint[]): void {
  if (telemetry.length < 3) return;

  const toRad = (d: number) => d * Math.PI / 180;

  for (let i = 1; i < telemetry.length - 1; i++) {
    const prev = telemetry[i - 1];
    const curr = telemetry[i];
    const next = telemetry[i + 1];

    const dtPrev = (curr.timestamp - prev.timestamp) / 1000; // seconds
    const dtNext = (next.timestamp - curr.timestamp) / 1000;

    if (dtPrev <= 0 || dtNext <= 0) continue;

    // ── Longitudinal G (braking/acceleration) ──
    // Derivative of speed: dv/dt
    const speedPrev = prev.speed_kmh / 3.6; // m/s
    const speedCurr = curr.speed_kmh / 3.6;
    const speedNext = next.speed_kmh / 3.6;

    // Central difference for smoother derivative
    const dt = (dtPrev + dtNext) / 2;
    const dvdt = (speedNext - speedPrev) / (dtPrev + dtNext);
    
    // Longitudinal G: positive = accelerating, negative = braking
    const longG = dvdt / G;

    // ── Lateral G (cornering force) ──
    // Compute heading from GPS bearing
    const bearing1 = gpsBearing(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const bearing2 = gpsBearing(curr.latitude, curr.longitude, next.latitude, next.longitude);

    // Angular velocity: heading change per second (rad/s)
    let dHeading = bearing2 - bearing1;
    // Normalize to [-180, 180]
    if (dHeading > 180) dHeading -= 360;
    if (dHeading < -180) dHeading += 360;

    const headingRateRadPerSec = toRad(dHeading) / dt;

    // Lateral acceleration = v * ω (speed × angular velocity)
    const latAccel = speedCurr * headingRateRadPerSec;

    // Lateral G: positive = turning right, negative = turning left
    const latG = latAccel / G;

    // Write derived values back into telemetry
    // accel_x = longitudinal (forward/backward)
    // accel_y = lateral (left/right)
    curr.accel_x = clampG(longG, 3.0);
    curr.accel_y = clampG(latG, 3.0);
  }

  // Copy edge values from neighbors
  if (telemetry.length >= 3) {
    telemetry[0].accel_x = telemetry[1].accel_x;
    telemetry[0].accel_y = telemetry[1].accel_y;
    telemetry[telemetry.length - 1].accel_x = telemetry[telemetry.length - 2].accel_x;
    telemetry[telemetry.length - 1].accel_y = telemetry[telemetry.length - 2].accel_y;
  }

  // Apply a simple 3-point moving average to smooth GPS noise
  smoothGForces(telemetry);
}

/**
 * 3-point moving average to filter GPS noise from derived G values.
 */
function smoothGForces(telemetry: TelemetryPoint[]): void {
  if (telemetry.length < 3) return;

  // Buffer the raw values first
  const rawX = telemetry.map(t => t.accel_x);
  const rawY = telemetry.map(t => t.accel_y);

  for (let i = 1; i < telemetry.length - 1; i++) {
    telemetry[i].accel_x = (rawX[i - 1] + rawX[i] + rawX[i + 1]) / 3;
    telemetry[i].accel_y = (rawY[i - 1] + rawY[i] + rawY[i + 1]) / 3;
  }
}

/**
 * Clamp G values to realistic motorsport range and filter GPS noise spikes.
 */
function clampG(value: number, maxG: number): number {
  if (!isFinite(value)) return 0;
  return Math.max(-maxG, Math.min(maxG, value));
}

/**
 * GPS bearing between two points in degrees.
 */
function gpsBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}
