/**
 * Exponential Moving Average (EMA) smoother for ghost delta values.
 * 
 * Prevents:
 * - Jitter from GPS noise
 * - Rapid sign flips (+/- oscillation)
 * - Visual instability in the delta HUD
 *
 * Preserves:
 * - Responsiveness to real driving differences
 * - Natural corner-by-corner oscillation
 * - Immediate visibility of braking/acceleration changes
 */
export class GhostDeltaSmoother {
  private smoothedDelta: number = 0;
  private initialized: boolean = false;
  private readonly alpha: number;

  /**
   * @param alpha - Smoothing factor (0 < alpha < 1).
   *   Higher = more responsive but jittery.
   *   Lower = smoother but laggier.
   *   Default 0.15 is tuned for 60fps GPS telemetry.
   */
  constructor(alpha: number = 0.15) {
    this.alpha = alpha;
  }

  /**
   * Feed a new raw delta value, get back the smoothed value.
   */
  update(rawDeltaMs: number): number {
    if (!this.initialized) {
      this.smoothedDelta = rawDeltaMs;
      this.initialized = true;
      return rawDeltaMs;
    }

    // EMA: smoothed = alpha * new + (1 - alpha) * previous
    this.smoothedDelta = this.alpha * rawDeltaMs + (1 - this.alpha) * this.smoothedDelta;
    return this.smoothedDelta;
  }

  /**
   * Reset when scrubbing or switching laps.
   */
  reset(): void {
    this.smoothedDelta = 0;
    this.initialized = false;
  }

  /**
   * Returns the current smoothed value without advancing.
   */
  current(): number {
    return this.smoothedDelta;
  }
}
