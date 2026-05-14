import { TelemetryPoint, Segment, Lap } from '../types/telemetry';

// ─────────────────────────────────────────────
// Mock Telemetry: 3 laps of telemetry data (100ms intervals = 10Hz)
// Complete track from start/finish to corner sequences
// ─────────────────────────────────────────────
function generateLapTelemetry(lapStart: number): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  
  // Straight 1: acceleration phase (0-600ms)
  for (let t = 0; t <= 600; t += 100) {
    const ratio = t / 600;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8274 + ratio * 0.0011,
      longitude: -1.3730 - ratio * 0.0015,
      altitude: 138.5 - ratio * 0.5,
      speed_kmh: 45 + ratio * 107,
      accel_x: 0.5, accel_y: 0, accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: 0
    });
  }
  
  // Corner 1 - Medium speed right (700-1100ms)
  for (let t = 700; t <= 1100; t += 100) {
    const ratio = (t - 700) / 400;
    const entry = ratio < 0.5;
    const accelY = entry ? 0.8 + ratio * 1.6 : 2.0 - (ratio - 0.5) * 1.0;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8285 + Math.sin(ratio * Math.PI) * 0.0008,
      longitude: -1.3715 + Math.cos(ratio * Math.PI) * 0.0012,
      altitude: 137.5 - ratio * 0.5,
      speed_kmh: 152 - (entry ? ratio * 47 : (ratio - 0.5) * 20),
      accel_x: entry ? -0.5 - ratio : -0.3 + (ratio - 0.5) * 0.8,
      accel_y: accelY,
      accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: entry ? 5 + ratio * 7 : 12 - (ratio - 0.5) * 10
    });
  }
  
  // Straight 2: acceleration (1200-1500ms)
  for (let t = 1200; t <= 1500; t += 100) {
    const ratio = (t - 1200) / 300;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8287 + ratio * 0.0004,
      longitude: -1.3691 - ratio * 0.0006,
      altitude: 137.1 - ratio * 0.3,
      speed_kmh: 118 + ratio * 37,
      accel_x: 0.6, accel_y: 0, accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: 0
    });
  }
  
  // Corner 2 - High speed kink (1500-1700ms)
  for (let t = 1500; t <= 1700; t += 100) {
    const ratio = (t - 1500) / 200;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8288 - ratio * 0.0003,
      longitude: -1.3685 - ratio * 0.0008,
      altitude: 137.4 - ratio * 0.4,
      speed_kmh: 155 + ratio * 7 - (ratio > 0.5 ? ratio * 5 : 0),
      accel_x: ratio < 0.5 ? 0.1 : 0,
      accel_y: ratio < 0.5 ? 0.3 : -0.2,
      accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: -ratio * 22
    });
  }
  
  // Corner 3 - Chicane (1700-1800ms)
  for (let t = 1700; t <= 1800; t += 100) {
    const ratio = (t - 1700) / 100;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8287 + Math.sin(ratio * Math.PI * 2) * 0.0005,
      longitude: -1.3693 + Math.cos(ratio * Math.PI * 2) * 0.0004,
      altitude: 137.0,
      speed_kmh: 162 - ratio * 3,
      accel_x: 0.2, accel_y: Math.sin(ratio * Math.PI * 2) * 0.5,
      accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: -ratio * 8
    });
  }
  
  // Final straight (1800-1900ms)
  for (let t = 1800; t <= 1900; t += 100) {
    const ratio = (t - 1800) / 100;
    points.push({
      timestamp: lapStart + t,
      latitude: 52.8287,
      longitude: -1.3693 + ratio * 0.0037,
      altitude: 137.0,
      speed_kmh: 159 + ratio * 16,
      accel_x: 0.1, accel_y: 0,
      accel_z: 0,
      gyro_x: 0, gyro_y: 0, gyro_z: 0
    });
  }
  
  return points;
}

export const MOCK_TELEMETRY: TelemetryPoint[] = [
  ...generateLapTelemetry(0),
  ...generateLapTelemetry(1900),
  ...generateLapTelemetry(3800),
];

// ─────────────────────────────────────────────
// Mock Segments: segments that repeat each lap
// ─────────────────────────────────────────────
function generateSegments(lapOffset: number): Segment[] {
  const baseSegments: Segment[] = [
    {
      segment_id: 'S1', segment_type: 'straight', classification: 'Straight 1',
      start_timestamp: 0, end_timestamp: 600, duration_seconds: 0.6,
      average_speed: 110, heading_change_degrees: 5, confidence_score: 0.95,
    },
    {
      segment_id: 'C1', segment_type: 'corner', classification: 'Right Medium-speed Corner',
      start_timestamp: 700, end_timestamp: 1100, duration_seconds: 0.4,
      average_speed: 120, heading_change_degrees: 78, confidence_score: 0.92,
    },
    {
      segment_id: 'S2', segment_type: 'straight', classification: 'Straight 2',
      start_timestamp: 1200, end_timestamp: 1500, duration_seconds: 0.3,
      average_speed: 140, heading_change_degrees: 3, confidence_score: 0.97,
    },
    {
      segment_id: 'C2', segment_type: 'corner', classification: 'Left High-speed Kink',
      start_timestamp: 1500, end_timestamp: 1700, duration_seconds: 0.2,
      average_speed: 162, heading_change_degrees: -22, confidence_score: 0.88,
    },
    {
      segment_id: 'C3', segment_type: 'corner', classification: 'Compound Chicane',
      start_timestamp: 1700, end_timestamp: 1800, duration_seconds: 0.1,
      average_speed: 170, heading_change_degrees: -8, confidence_score: 0.75,
    },
    {
      segment_id: 'S3', segment_type: 'straight', classification: 'Sprint Finish',
      start_timestamp: 1800, end_timestamp: 1900, duration_seconds: 0.1,
      average_speed: 174, heading_change_degrees: 2, confidence_score: 0.98,
    },
  ];
  
  return baseSegments.map(seg => ({
    ...seg,
    start_timestamp: seg.start_timestamp + lapOffset,
    end_timestamp: seg.end_timestamp + lapOffset,
  }));
}

export const MOCK_SEGMENTS: Segment[] = [
  ...generateSegments(0),
  ...generateSegments(1900),
  ...generateSegments(3800),
];

// ─────────────────────────────────────────────
// Mock Laps: 3 complete laps on the circuit
// ─────────────────────────────────────────────
export const MOCK_LAPS: Lap[] = [
  { lap_number: 1, start_timestamp: 0, end_timestamp: 1900, lap_duration_seconds: 1.9 },
  { lap_number: 2, start_timestamp: 1900, end_timestamp: 3800, lap_duration_seconds: 1.9 },
  { lap_number: 3, start_timestamp: 3800, end_timestamp: 5700, lap_duration_seconds: 1.9 },
];
