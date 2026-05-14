import { TelemetryPoint, Segment, Lap } from '../types/telemetry';

// ─────────────────────────────────────────────
// Mock Telemetry: 20 frames of a car entering and exiting a corner
// Timestamps are in ms offset from session start (100ms apart = 10Hz)
// ─────────────────────────────────────────────
export const MOCK_TELEMETRY: TelemetryPoint[] = [
  { timestamp: 0,    latitude: 52.8274, longitude: -1.3730, altitude: 138.5, speed_kmh: 45,  accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 100,  latitude: 52.8275, longitude: -1.3729, altitude: 138.4, speed_kmh: 68,  accel_x: 0.3,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 200,  latitude: 52.8277, longitude: -1.3727, altitude: 138.3, speed_kmh: 95,  accel_x: 0.5,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 300,  latitude: 52.8279, longitude: -1.3725, altitude: 138.1, speed_kmh: 118, accel_x: 0.4,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 400,  latitude: 52.8281, longitude: -1.3722, altitude: 137.9, speed_kmh: 135, accel_x: 0.2,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 500,  latitude: 52.8283, longitude: -1.3719, altitude: 137.7, speed_kmh: 148, accel_x: 0.1,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 600,  latitude: 52.8285, longitude: -1.3715, altitude: 137.5, speed_kmh: 152, accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  // ── Corner entry ──
  { timestamp: 700,  latitude: 52.8287, longitude: -1.3711, altitude: 137.3, speed_kmh: 142, accel_x: -0.5, accel_y: 1.2,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 5 },
  { timestamp: 800,  latitude: 52.8288, longitude: -1.3707, altitude: 137.2, speed_kmh: 128, accel_x: -0.8, accel_y: 1.5,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 8 },
  { timestamp: 900,  latitude: 52.8289, longitude: -1.3703, altitude: 137.1, speed_kmh: 115, accel_x: -1.0, accel_y: 1.8,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 10 },
  // ── Apex ──
  { timestamp: 1000, latitude: 52.8289, longitude: -1.3699, altitude: 137.0, speed_kmh: 105, accel_x: -0.3, accel_y: 2.0,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 12 },
  { timestamp: 1100, latitude: 52.8288, longitude: -1.3695, altitude: 137.0, speed_kmh: 108, accel_x: 0.1,  accel_y: 1.8,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 10 },
  // ── Corner exit ──
  { timestamp: 1200, latitude: 52.8287, longitude: -1.3691, altitude: 137.1, speed_kmh: 118, accel_x: 0.4,  accel_y: 1.2,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 6 },
  { timestamp: 1300, latitude: 52.8285, longitude: -1.3688, altitude: 137.2, speed_kmh: 132, accel_x: 0.6,  accel_y: 0.5,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 2 },
  { timestamp: 1400, latitude: 52.8283, longitude: -1.3685, altitude: 137.3, speed_kmh: 145, accel_x: 0.3,  accel_y: 0.1,  accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 1500, latitude: 52.8281, longitude: -1.3682, altitude: 137.4, speed_kmh: 155, accel_x: 0.1,  accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 1600, latitude: 52.8279, longitude: -1.3679, altitude: 137.5, speed_kmh: 162, accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 1700, latitude: 52.8277, longitude: -1.3676, altitude: 137.6, speed_kmh: 168, accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 1800, latitude: 52.8275, longitude: -1.3673, altitude: 137.7, speed_kmh: 172, accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
  { timestamp: 1900, latitude: 52.8273, longitude: -1.3670, altitude: 137.8, speed_kmh: 175, accel_x: 0,    accel_y: 0,    accel_z: 0, gyro_x: 0, gyro_y: 0, gyro_z: 0 },
];

// ─────────────────────────────────────────────
// Mock Segments: 3 straights, 2 corners, 1 chicane
// ─────────────────────────────────────────────
export const MOCK_SEGMENTS: Segment[] = [
  {
    segment_id: 'S1', segment_type: 'straight', classification: 'Straight',
    start_timestamp: 0, end_timestamp: 600, duration_seconds: 0.6,
    average_speed: 110, heading_change_degrees: 5, confidence_score: 0.95,
  },
  {
    segment_id: 'S2', segment_type: 'corner', classification: 'Right Medium-speed Corner',
    start_timestamp: 700, end_timestamp: 1100, duration_seconds: 0.4,
    average_speed: 120, heading_change_degrees: 78, confidence_score: 0.92,
  },
  {
    segment_id: 'S3', segment_type: 'straight', classification: 'Straight',
    start_timestamp: 1200, end_timestamp: 1500, duration_seconds: 0.3,
    average_speed: 140, heading_change_degrees: 3, confidence_score: 0.97,
  },
  {
    segment_id: 'S4', segment_type: 'corner', classification: 'Left High-speed Kink',
    start_timestamp: 1500, end_timestamp: 1700, duration_seconds: 0.2,
    average_speed: 162, heading_change_degrees: -22, confidence_score: 0.88,
  },
  {
    segment_id: 'S5', segment_type: 'corner', classification: 'Compound Chicane',
    start_timestamp: 1700, end_timestamp: 1800, duration_seconds: 0.1,
    average_speed: 170, heading_change_degrees: -8, confidence_score: 0.75,
  },
  {
    segment_id: 'S6', segment_type: 'straight', classification: 'Straight',
    start_timestamp: 1800, end_timestamp: 1900, duration_seconds: 0.1,
    average_speed: 174, heading_change_degrees: 2, confidence_score: 0.98,
  },
];

// ─────────────────────────────────────────────
// Mock Laps
// ─────────────────────────────────────────────
export const MOCK_LAPS: Lap[] = [
  { lap_number: 1, start_timestamp: 0, end_timestamp: 1900, lap_duration_seconds: 1.9 },
];
