import { TelemetryPoint, Segment, Lap } from '../types/telemetry';
import { interpolateTelemetry } from './interpolation';
import { useReplayStore } from '../store/replayStore';

export type EngineCallback = (interpolated: TelemetryPoint) => void;

export class ReplayEngine {
  private telemetry: TelemetryPoint[] = [];
  private segments: Segment[] = [];
  private laps: Lap[] = [];
  
  private rAFId: number | null = null;
  private lastRealTime: number = 0;
  
  // Subscribers
  private callbacks: EngineCallback[] = [];

  constructor(telemetry: TelemetryPoint[], segments: Segment[], laps: Lap[]) {
    this.telemetry = telemetry;
    this.segments = segments;
    this.laps = laps;
  }

  public subscribe(cb: EngineCallback) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(c => c !== cb);
    };
  }

  public start() {
    if (this.rAFId !== null) return;
    this.lastRealTime = performance.now();
    this.loop(this.lastRealTime);
  }

  public pause() {
    if (this.rAFId !== null) {
      cancelAnimationFrame(this.rAFId);
      this.rAFId = null;
    }
  }

  public updateManual(timestamp: number) {
    this.processFrame(timestamp);
  }

  private loop = (time: number) => {
    const deltaRealMs = time - this.lastRealTime;
    this.lastRealTime = time;

    const store = useReplayStore.getState();
    if (!store.isPlaying) return;

    // Advance virtual timestamp
    let newTimestamp = store.currentTimestamp + (deltaRealMs * store.playbackSpeed);
    
    if (newTimestamp > store.sessionEnd) {
      newTimestamp = store.sessionEnd;
      store.togglePlay();
    }
    
    store.setCurrentTimestamp(newTimestamp); // Updates zustand state for controls (runs every frame but it's cheap)
    this.processFrame(newTimestamp);

    this.rAFId = requestAnimationFrame(this.loop);
  };

  private processFrame(timestamp: number) {
    if (this.telemetry.length === 0) return;

    // 1. Interpolate Telemetry
    // Binary search or simple math since it's exactly 10Hz
    // Let's do simple binary search for robustness if gaps exist
    let t1 = this.telemetry[0];
    let t2 = this.telemetry[this.telemetry.length - 1];
    
    let low = 0;
    let high = this.telemetry.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.telemetry[mid].timestamp <= timestamp) {
        t1 = this.telemetry[mid];
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    const nextIdx = Math.min(this.telemetry.indexOf(t1) + 1, this.telemetry.length - 1);
    t2 = this.telemetry[nextIdx];

    const currentData = interpolateTelemetry(t1, t2, timestamp);
    
    // Notify DOM listeners (imperative)
    this.callbacks.forEach(cb => cb(currentData));

    // 2. Dispatch boundary events to Zustand (Discrete)
    const store = useReplayStore.getState();
    
    // Find current segment
    const activeSegment = this.segments.find(s => timestamp >= s.start_timestamp && timestamp <= s.end_timestamp);
    if (activeSegment && activeSegment.segment_id !== store.currentSegmentId) {
      store.setCurrentSegmentId(activeSegment.segment_id);
    } else if (!activeSegment && store.currentSegmentId !== null) {
      store.setCurrentSegmentId(null);
    }
    
    // Find current lap
    const activeLap = this.laps.find(l => timestamp >= l.start_timestamp && timestamp <= l.end_timestamp);
    if (activeLap && activeLap.lap_number !== store.currentLapNumber) {
      store.setCurrentLapNumber(activeLap.lap_number);
    }
  }
}
