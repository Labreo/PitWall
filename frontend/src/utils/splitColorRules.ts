/**
 * Universal Split Colors for the timing HUD.
 */
export const SPLIT_COLORS = {
  /** Ahead AND gained time during current segment */
  BLUE: '#3b82f6', // or '#60a5fa'
  /** New best segment achieved across all laps */
  GOLD: '#fbbf24', // or '#f59e0b'
  /** Ahead of PB pace */
  GREEN: '#10b981', // or '#34d399'
  /** Behind PB pace */
  RED: '#ef4444', // or '#f87171'
  /** Neutral / Unknown */
  NEUTRAL: '#94a3b8'
};

export type SplitColorStatus = 'blue' | 'gold' | 'green' | 'red' | 'neutral';

export function getSplitColorValue(status: SplitColorStatus): string {
  switch (status) {
    case 'blue': return SPLIT_COLORS.BLUE;
    case 'gold': return SPLIT_COLORS.GOLD;
    case 'green': return SPLIT_COLORS.GREEN;
    case 'red': return SPLIT_COLORS.RED;
    default: return SPLIT_COLORS.NEUTRAL;
  }
}
