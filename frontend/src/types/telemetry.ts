export interface TelemetryPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed_kmh: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
}

export interface Segment {
  segment_id: string;
  segment_type: 'straight' | 'corner';
  classification: string;
  start_timestamp: number;
  end_timestamp: number;
  duration_seconds: number;
  average_speed: number;
  heading_change_degrees: number;
  confidence_score: number;
}

export interface Lap {
  lap_number: number;
  start_timestamp: number;
  end_timestamp: number;
  lap_duration_seconds: number;
}
