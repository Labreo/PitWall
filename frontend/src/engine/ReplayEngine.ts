import { TelemetryPoint, Segment, Lap } from '../types/telemetry';
import { CoachingEvent } from '../types/coaching';
import { interpolateTelemetry } from './interpolation';
import { useReplayStore } from '../store/replayStore';
import { CoachingScheduler } from './coachingScheduler';
import { coachingAudioQueue } from './coachingAudioQueue';
import { splitStateMachine } from './splitStateMachine';

export type EngineCallback = (
  interpolated: TelemetryPoint,
  ghost: TelemetryPoint | null,
  ghostTimeDeltaMs: number   // positive = current lap is behind best lap (losing time)
) => void;

export class ReplayEngine {
  private telemetry: TelemetryPoint[] = [];
  private segments: Segment[] = [];
  private laps: Lap[] = [];
  private coachingEvents: CoachingEvent[] = [];
  private scheduler: CoachingScheduler;

  private rAFId: number | null = null;
  private lastRealTime: number = 0;

  // Performance: cached index lookups
  private cachedIndex: number = 0;
  private ghostCachedIndex: number = 0;
  private bestLapCache: Lap | null = null;

  // Subscribers
  private callbacks: EngineCallback[] = [];

  constructor(telemetry: TelemetryPoint[], segments: Segment[], laps: Lap[], coachingEvents: CoachingEvent[] = []) {
    this.telemetry = telemetry;
    this.segments = segments;
    this.laps = laps;
    this.coachingEvents = coachingEvents;
    
    // Initialize the synchronization engine
    this.scheduler = new CoachingScheduler(coachingEvents);

    if (laps.length > 0) {
      this.bestLapCache = [...laps].sort((a, b) => a.lap_duration_seconds - b.lap_duration_seconds)[0];
    }

    // Initialize Split State Machine
    splitStateMachine.initialize(laps, segments);
  }

  public setTelemetry(telemetry: TelemetryPoint[], laps: Lap[], segments: Segment[]) {
    this.telemetry = telemetry;
    this.laps = laps;
    this.segments = segments;
    this.cachedIndex = 0;
    this.ghostCachedIndex = 0;
    this.scheduler.reset(0);
    
    if (laps.length > 0) {
      this.bestLapCache = [...laps].sort((a, b) => a.lap_duration_seconds - b.lap_duration_seconds)[0];
    }
    splitStateMachine.initialize(laps, segments);
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
    // Scrub resets scheduler state
    this.scheduler.reset(timestamp);
    coachingAudioQueue.stop();
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

    // Trigger coaching events for this frame
    this.scheduler.update(newTimestamp, store.isPlaying);

    store.setCurrentTimestamp(newTimestamp);
    this.processFrame(newTimestamp);

    this.rAFId = requestAnimationFrame(this.loop);
  };

  private processFrame(timestamp: number) {
    if (this.telemetry.length === 0) return;

    // 1. Interpolate Telemetry
    let idx = Math.max(0, Math.min(this.cachedIndex, this.telemetry.length - 2));

    while (idx < this.telemetry.length - 1 && this.telemetry[idx + 1].timestamp <= timestamp) {
      idx++;
    }
    while (idx > 0 && this.telemetry[idx].timestamp > timestamp) {
      idx--;
    }

    this.cachedIndex = idx;

    const t1 = this.telemetry[idx];
    const t2 = this.telemetry[Math.min(idx + 1, this.telemetry.length - 1)];

    const currentData = interpolateTelemetry(t1, t2, timestamp);

    // 2. Dispatch boundary events to State Machine & Zustand
    const store = useReplayStore.getState();

    // The state machine handles all deterministic split logic and history recomputation
    splitStateMachine.processToTimestamp(timestamp);
    
    const { activeLapNumber, activeSegmentId } = splitStateMachine.getActiveState();

    if (activeSegmentId !== store.currentSegmentId) {
      store.setCurrentSegmentId(activeSegmentId);
    }

    if (activeLapNumber !== store.currentLapNumber) {
      store.setCurrentLapNumber(activeLapNumber);
    }


    const activeLap = this.laps.find(l => timestamp >= l.start_timestamp && timestamp <= l.end_timestamp);

    // 3. Calculate Ghost Lap (Best Lap So Far)
    // Ghost replays actual best-lap telemetry at the proportionally equivalent elapsed time.
    // Uses a separate cached index so ghost search never corrupts main car search.
    let ghostData: TelemetryPoint | null = null;
    let ghostTimeDeltaMs = 0;

    let bestLapSoFar: Lap | null = null;
    if (activeLap) {
      const completedLaps = this.laps.filter(l => l.lap_number < activeLap.lap_number);
      if (completedLaps.length > 0) {
        bestLapSoFar = completedLaps.sort((a, b) => a.lap_duration_seconds - b.lap_duration_seconds)[0];
      }
    }

    if (store.ghostModeEnabled && activeLap && activeLap.lap_number > 1 && bestLapSoFar) {
      const bestLap = bestLapSoFar;

      const elapsedMs = timestamp - activeLap.start_timestamp;
      const activeLapDurationMs = activeLap.end_timestamp - activeLap.start_timestamp;
      const bestLapDurationMs = bestLap.end_timestamp - bestLap.start_timestamp;

      const progress = activeLapDurationMs > 0 ? elapsedMs / activeLapDurationMs : 0;
      const ghostLapTimestamp = bestLap.start_timestamp + progress * bestLapDurationMs;

      // Positive delta = current lap is behind best lap at this point in the lap
      ghostTimeDeltaMs = elapsedMs - (bestLapDurationMs * progress);

      if (ghostLapTimestamp <= bestLap.end_timestamp) {
        let gIdx = Math.max(0, Math.min(this.ghostCachedIndex, this.telemetry.length - 2));
        while (gIdx < this.telemetry.length - 1 && this.telemetry[gIdx + 1].timestamp <= ghostLapTimestamp) {
          gIdx++;
        }
        while (gIdx > 0 && this.telemetry[gIdx].timestamp > ghostLapTimestamp) {
          gIdx--;
        }
        this.ghostCachedIndex = gIdx;

        const g1 = this.telemetry[gIdx];
        const g2 = this.telemetry[Math.min(gIdx + 1, this.telemetry.length - 1)];

        ghostData = interpolateTelemetry(g1, g2, ghostLapTimestamp);
      }
    }

    // Notify DOM listeners (imperative)
    this.callbacks.forEach(cb => cb(currentData, ghostData, ghostTimeDeltaMs));
  }
}
