/**
 * deltaSmoother.py — Lightweight rolling average for telemetry jitter.
 */

export class DeltaSmoother {
  private window: number[];
  private size: number;
  private sum: number = 0;

  constructor(size: number = 10) {
    this.size = size;
    this.window = [];
  }

  public smooth(value: number): number {
    this.window.push(value);
    this.sum += value;

    if (this.window.length > this.size) {
      const removed = this.window.shift()!;
      this.sum -= removed;
    }

    return this.sum / this.window.length;
  }

  public reset() {
    this.window = [];
    this.sum = 0;
  }
}
