/**
 * staticSessionLoader.ts — Fetches preprocessed session assets for static deployment.
 */
import { TelemetryPoint, Segment, Lap } from '../types/telemetry';
import { CoachingEvent } from '../types/coaching';

export interface DemoSession {
  telemetry: TelemetryPoint[];
  segments: Segment[];
  laps: Lap[];
  session: any;
  coaching: CoachingEvent[];
}

export async function loadDemoSession(): Promise<DemoSession> {
  const [telemetry, segments, laps, session, coaching] = await Promise.all([
    fetch('/demo/telemetry.json').then(r => r.json()),
    fetch('/demo/segments.json').then(r => r.json()),
    fetch('/demo/laps.json').then(r => r.json()),
    fetch('/demo/session.json').then(r => r.json()),
    fetch('/demo/coaching.json').then(r => r.json()),
  ]);

  return { telemetry, segments, laps, session, coaching };
}
