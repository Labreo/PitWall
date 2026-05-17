export type CoachingCategory = 'braking' | 'apex' | 'throttle' | 'consistency' | 'racing_line';
export type CoachingSeverity = 'info' | 'warn' | 'critical';

export interface CoachingEvent {
  id: string;
  timestamp: number;
  corner_id: string | null;
  severity: CoachingSeverity;
  message: string;
  delta_time_loss: number;
  category: CoachingCategory;
  audio_url?: string;
  audio_duration?: number;
}
