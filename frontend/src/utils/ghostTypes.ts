import { TelemetryPoint, Lap } from '../types/telemetry';

export type GhostSource = 'best' | 'selected' | 'theoretical';

export type GhostOffset = 0 | 200 | 400 | 600;

export const GHOST_OFFSETS: { value: GhostOffset; label: string }[] = [
  { value: 0, label: '0ms' },
  { value: 200, label: '+200ms' },
  { value: 400, label: '+400ms' },
  { value: 600, label: '+600ms' },
];

export interface GhostLapData {
  source: GhostSource;
  lap: Lap;
  /** Precomputed telemetry slice for this lap only */
  telemetry: TelemetryPoint[];
  /** Label for the HUD */
  label: string;
}

export interface GhostConfig {
  enabled: boolean;
  source: GhostSource;
  selectedLapNumber: number;
  offsetMs: GhostOffset;
  showTrail: boolean;
}
