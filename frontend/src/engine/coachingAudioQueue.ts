import { CoachingEvent } from '../types/coaching';
import { useCoachingStore } from '../store/coachingStore';

class CoachingAudioQueue {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  /**
   * Unlocks the browser speech engine on first user interaction.
   * Modern browsers block speech until a gesture occurs.
   */
  public unlock() {
    const store = useCoachingStore.getState();
    if (store.isUnlocked) return;

    console.log('[RADIO] Unlocking speech engine...');
    const warmup = new SpeechSynthesisUtterance(' ');
    warmup.volume = 0;
    this.synth.speak(warmup);
    store.unlock();
  }

  public play(event: CoachingEvent) {
    console.log(`[RADIO] EVENT_FIRED: ${event.corner_id} - ${event.message}`);
    const store = useCoachingStore.getState();

    // Unlock if not already (safeguard)
    if (!store.isUnlocked) this.unlock();
    
    // Interrupt if critical, otherwise queue
    if (store.activeEvent && event.severity !== 'critical') {
      console.log(`[RADIO] QUEUED: ${event.id}`);
      store.addToQueue(event);
      return;
    }

    this.execute(event);
  }

  private execute(event: CoachingEvent) {
    const store = useCoachingStore.getState();
    
    // Cancel any current speech (interrupt)
    this.stop();

    console.log(`[RADIO] SPEAK_START: ${event.id}`);
    store.setActiveEvent(event);
    store.setPlaybackStatus('playing');

    const utterance = new SpeechSynthesisUtterance(event.message);
    
    // F1 Engineer Style: Calm, professional, slightly lower pitch
    utterance.rate = 1.05; // Slightly faster but clear
    utterance.pitch = 0.85; // Lower pitch for engineer feel
    utterance.volume = 1.0;

    // Browser-native event listeners
    utterance.onend = () => {
      console.log(`[RADIO] SPEAK_END: ${event.id}`);
      store.clearActive();
      this.currentUtterance = null;
      // Small pause between items for realism
      setTimeout(() => this.checkQueue(), 600);
    };

    utterance.onerror = (e) => {
      console.error(`[RADIO] SPEAK_ERROR: ${event.id}`, e);
      store.clearActive();
      this.currentUtterance = null;
      this.checkQueue();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  private checkQueue() {
    const store = useCoachingStore.getState();
    if (store.queue.length > 0) {
      const next = store.queue[0];
      useCoachingStore.setState({ queue: store.queue.slice(1) });
      this.execute(next);
    } else {
      console.log('[RADIO] QUEUE_EMPTY');
    }
  }

  public stop() {
    this.synth.cancel();
    const store = useCoachingStore.getState();
    store.clearActive();
    store.setPlaybackStatus('idle');
    useCoachingStore.setState({ queue: [] });
    this.currentUtterance = null;
  }
}

export const coachingAudioQueue = new CoachingAudioQueue();
