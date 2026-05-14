import { useEffect, useRef } from 'react';
import { ReplayEngine } from '../engine/ReplayEngine';
import { useReplayStore } from '../store/replayStore';
import { TelemetryPoint, Segment, Lap } from '../types/telemetry';
import { CoachingEvent } from '../types/coaching';
import { speechCoach } from '../services/SpeechCoach';

export function useReplayEngine(
  telemetry: TelemetryPoint[],
  segments: Segment[],
  laps: Lap[],
  coachingEvents: CoachingEvent[] = []
) {
  const engineRef = useRef<ReplayEngine | null>(null);
  const isPlaying = useReplayStore(state => state.isPlaying);
  const currentTimestamp = useReplayStore(state => state.currentTimestamp);

  useEffect(() => {
    if (telemetry.length === 0) return;

    const engine = new ReplayEngine(telemetry, segments, laps, coachingEvents);
    engineRef.current = engine;

    useReplayStore.getState().initializeSession(
      telemetry[0].timestamp,
      telemetry[telemetry.length - 1].timestamp
    );

    return () => {
      engine.pause();
    };
  }, [telemetry, segments, laps, coachingEvents]);

  // Handle Play/Pause
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.start();
    } else {
      engineRef.current.pause();
    }
  }, [isPlaying]);

  // Handle scrubbing when paused
  useEffect(() => {
    if (!engineRef.current || isPlaying) return;
    engineRef.current.updateManual(currentTimestamp);
  }, [currentTimestamp, isPlaying]);

  // Mount/unmount speech coach — separate from engine lifecycle
  useEffect(() => {
    speechCoach.mount();
    return () => speechCoach.unmount();
  }, []);

  return engineRef;
}
