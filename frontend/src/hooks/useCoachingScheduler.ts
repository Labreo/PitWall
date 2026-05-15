import { useEffect, useRef } from 'react';
import { CoachingEvent } from '../types/coaching';
import { CoachingScheduler } from '../engine/coachingScheduler';

export const useCoachingScheduler = (
  events: CoachingEvent[],
  currentTimestamp: number,
  isPlaying: boolean
) => {
  const schedulerRef = useRef<CoachingScheduler | null>(null);

  // Initialize scheduler on load
  useEffect(() => {
    if (events.length > 0) {
      schedulerRef.current = new CoachingScheduler(events);
    }
  }, [events]);

  // Sync with replay engine loop
  useEffect(() => {
    if (schedulerRef.current) {
      schedulerRef.current.update(currentTimestamp, isPlaying);
    }
  }, [currentTimestamp, isPlaying]);

  return schedulerRef.current;
};
