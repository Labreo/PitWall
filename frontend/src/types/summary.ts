import { CoachingEvent } from './coaching';

export interface CornerPerformance {
  name: string;
  timeLost: number;
  confidence: number;
  recommendation: string;
  path: { latitude: number; longitude: number }[];
}

export interface DriverStrength {
  title: string;
  description: string;
  icon: string;
}

export interface SessionSummaryData {
  bestLapMs: number;
  theoreticalBestMs: number;
  potentialGainMs: number;
  totalLaps: number;
  consistencyScore: number; // 0-100
  topLossCorners: CornerPerformance[];
  strengths: DriverStrength[];
  priorities: string[];
}
