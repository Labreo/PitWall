import { useEffect, useRef, useState } from 'react';
import { ReplayEngine } from '../engine/ReplayEngine';
import { useReplayStore } from '../store/replayStore';
import { TelemetryPoint, Segment, Lap } from '../types/telemetry';

export function useReplayEngine(telemetry: TelemetryPoint[], segments: Segment[], laps: Lap[]) {
  const engineRef = useRef<ReplayEngine | null>(null);
  const isPlaying = useReplayStore(state => state.isPlaying);
  const currentTimestamp = useReplayStore(state => state.currentTimestamp);
  
  useEffect(() => {
    if (telemetry.length === 0) return;
    
    const engine = new ReplayEngine(telemetry, segments, laps);
    engineRef.current = engine;
    
    useReplayStore.getState().initializeSession(
      telemetry[0].timestamp,
      telemetry[telemetry.length - 1].timestamp
    );

    return () => {
      engine.pause();
    };
  }, [telemetry, segments, laps]);

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

  return engineRef;
}
