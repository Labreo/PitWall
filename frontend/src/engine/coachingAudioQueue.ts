import { CoachingEvent } from '../types/coaching';
import { useCoachingStore } from '../store/coachingStore';

class CoachingAudioQueue {
  private timer: any = null;

  /**
   * Estimates playback duration based on word count (avg 150 wpm)
   * Plus a cinematic padding for radio opening/closing sounds.
   */
  private estimateDuration(text: string): number {
    const words = text.split(' ').length;
    const baseMs = (words / 150) * 60 * 1000;
    return baseMs + 1200; // 1.2s padding for radio feel
  }

  public play(event: CoachingEvent) {
    const store = useCoachingStore.getState();
    
    // Interrupt existing if critical, otherwise queue
    if (store.activeEvent && event.severity !== 'critical') {
      store.addToQueue(event);
      return;
    }

    this.execute(event);
  }

  private execute(event: CoachingEvent) {
    const store = useCoachingStore.getState();
    
    if (this.timer) clearTimeout(this.timer);

    store.setActiveEvent(event);
    store.setPlaybackStatus('playing');

    const duration = this.estimateDuration(event.message);

    this.timer = setTimeout(() => {
      store.clearActive();
      this.checkQueue();
    }, duration);
  }

  private checkQueue() {
    const store = useCoachingStore.getState();
    if (store.queue.length > 0) {
      const next = store.queue[0];
      // Update queue
      useCoachingStore.setState({ queue: store.queue.slice(1) });
      this.execute(next);
    }
  }

  public stop() {
    if (this.timer) clearTimeout(this.timer);
    const store = useCoachingStore.getState();
    store.clearActive();
  }
}

export const coachingAudioQueue = new CoachingAudioQueue();
