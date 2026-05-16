/**
 * deltaColorScale.ts — Consistent color mapping for motorsport deltas.
 */

export const DELTA_COLORS = {
  GAINING: '#00ff88', // Formula 1 Green
  LOSING: '#ff3333',  // Formula 1 Red
  PARITY: '#ffffff',  // Neutral White
  GOLD: '#ffcc00',    // Purple/Gold Sector Record
};

export const getDeltaColor = (delta: number): string => {
  if (Math.abs(delta) < 0.01) return DELTA_COLORS.PARITY;
  return delta < 0 ? DELTA_COLORS.GAINING : DELTA_COLORS.LOSING;
};

export const getGlowStyle = (delta: number): string => {
  if (Math.abs(delta) < 0.05) return 'none';
  const color = getDeltaColor(delta);
  const intensity = Math.min(Math.abs(delta) * 5, 20); // Scale glow with delta
  return `0 0 ${intensity}px ${color}`;
};
