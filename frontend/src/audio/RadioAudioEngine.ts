import { CoachingEvent } from '../types/coaching';
import { useCoachingStore } from '../store/coachingStore';

export class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSource: AudioBufferSourceNode | null = null;
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private beepBuffer: AudioBuffer | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  /**
   * Initializes and unlocks the Web Audio API context.
   */
  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Unlocks the audio engine on user interaction.
   */
  public unlock() {
    console.log('[RADIO] Unlocking audio engine...');
    const store = useCoachingStore.getState();
    if (store.isUnlocked) return;

    try {
      const ctx = this.getContext();
      // Play a tiny silent buffer to warm up
      const buffer = ctx.createBuffer(1, 1, 22050);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      node.start(0);
      
      // Also warm up SpeechSynthesis
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      this.synth.speak(warmup);

      store.unlock();
      console.log('[RADIO] Audio engine successfully unlocked.');
    } catch (err) {
      console.error('[RADIO] Failed to unlock audio context:', err);
    }
  }

  /**
   * Preloads a batch of coaching events into memory.
   */
  public async preload(events: CoachingEvent[]) {
    console.log(`[RADIO] Preloading audio for ${events.length} coaching events...`);
    
    // Preload F1 Radio Beep Notification
    if (!this.beepBuffer) {
      try {
        const response = await fetch('/formula-1-radio-notification.mp3');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const ctx = this.getContext();
          this.beepBuffer = await ctx.decodeAudioData(arrayBuffer);
          console.log('[RADIO] Preloaded formula-1-radio-notification.mp3 successfully.');
        } else {
          console.warn('[RADIO] Beep fetch returned non-200 status.');
        }
      } catch (err) {
        console.warn('[RADIO] Failed to preload F1 Radio Beep:', err);
      }
    }

    const promises = events.map(async (e) => {
      if (!e.audio_url) return;
      
      const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
      const fullUrl = e.audio_url.startsWith('http') ? e.audio_url : `${backendHost}${e.audio_url}`;

      if (this.bufferCache.has(fullUrl)) return;

      try {
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        
        const ctx = this.getContext();
        // Decode audio data safely
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(fullUrl, audioBuffer);
      } catch (err) {
        console.warn(`[RADIO] Failed to preload audio for ${e.id} at ${fullUrl}:`, err);
      }
    });

    await Promise.all(promises);
    console.log(`[RADIO] Preload complete. Cached ${this.bufferCache.size} radio clips.`);
  }

  /**
   * Synthesizes and plays a radio open/close analog click chirp.
   */
  private playRadioClick(type: 'on' | 'off') {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'on') {
        // F1 radio open click: pop + brief high-frequency burst
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.04);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, ctx.currentTime);
        filter.Q.setValueAtTime(4, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else {
        // F1 radio close click: low-frequency analogue drop
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.05);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (err) {
      console.warn('[RADIO] Click generation failed:', err);
    }
  }

  /**
   * Plays the preloaded F1 Radio notification beep.
   */
  private playRadioBeep(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.beepBuffer) {
        // Fallback to synthetic pop if beep is not preloaded yet
        this.playRadioClick('on');
        setTimeout(resolve, 80);
        return;
      }

      try {
        const ctx = this.getContext();
        const source = ctx.createBufferSource();
        source.buffer = this.beepBuffer;
        
        // Connect to destination
        source.connect(ctx.destination);
        
        // Track the active source so it can be interrupted/stopped on scrub
        this.activeSource = source;

        source.onended = () => {
          if (this.activeSource === source) {
            this.activeSource = null;
          }
          resolve();
        };

        source.start(0);
      } catch (err) {
        console.warn('[RADIO] Beep play failed, using fallback pop click:', err);
        this.playRadioClick('on');
        setTimeout(resolve, 80);
      }
    });
  }

  /**
   * Main playback handler for replay coaching events.
   */
  public play(event: CoachingEvent) {
    console.log(`[RADIO] PLAY_REQUESTED: ${event.corner_id} - ${event.message}`);
    const store = useCoachingStore.getState();

    if (!store.isUnlocked) {
      this.unlock();
    }

    // Interrupt if critical, else queue
    if (store.activeEvent && event.severity !== 'critical') {
      console.log(`[RADIO] QUEUED: ${event.id}`);
      store.addToQueue(event);
      return;
    }

    this.execute(event);
  }

  /**
   * Interrupts current playback, plays a click chirp, and outputs Watson TTS or Web Speech fallback.
   */
  private async execute(event: CoachingEvent) {
    const store = useCoachingStore.getState();
    this.stopActiveAudio();

    console.log(`[RADIO] SPEAK_START: ${event.id}`);
    store.setActiveEvent(event);
    store.setPlaybackStatus('playing');

    // 1. Play authentic formula-1-radio-notification.mp3 beep
    await this.playRadioBeep();
    await new Promise((resolve) => setTimeout(resolve, 150)); // Tiny realistic communication lag

    // 2. Play Watson pre-generated audio if cached
    const backendHost = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    const fullUrl = event.audio_url ? (event.audio_url.startsWith('http') ? event.audio_url : `${backendHost}${event.audio_url}`) : '';
    const cachedBuffer = this.bufferCache.get(fullUrl);

    if (cachedBuffer) {
      try {
        const ctx = this.getContext();
        const source = ctx.createBufferSource();
        source.buffer = cachedBuffer;

        // Apply a tiny high-pass filter in frontend too as a safeguard
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(200, ctx.currentTime);

        source.connect(filter);
        filter.connect(ctx.destination);

        source.onended = () => {
          console.log(`[RADIO] SPEAK_END (Watson): ${event.id}`);
          this.playRadioClick('off');
          store.clearActive();
          this.activeSource = null;
          
          setTimeout(() => this.checkQueue(), 500);
        };

        this.activeSource = source;
        source.start(0);
        return;
      } catch (err) {
        console.error('[RADIO] Failed to play decoded Watson buffer. Falling back...', err);
      }
    }

    // 3. Fallback: Browser Web Speech API if Watson failed
    console.log(`[RADIO] Watson clip unavailable. Using browser fallback speech synthesis...`);
    const utterance = new SpeechSynthesisUtterance(event.message);
    utterance.rate = 1.05;
    utterance.pitch = 0.85;
    utterance.volume = 1.0;

    utterance.onend = () => {
      console.log(`[RADIO] SPEAK_END (Browser fallback): ${event.id}`);
      this.playRadioClick('off');
      store.clearActive();
      this.currentUtterance = null;
      
      setTimeout(() => this.checkQueue(), 500);
    };

    utterance.onerror = (e) => {
      console.error(`[RADIO] Browser synthesis error: ${event.id}`, e);
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

  /**
   * Resets active voice sources to prevent overlapping and overlapping voice artifacts.
   */
  private stopActiveAudio() {
    // Stop Web Audio node
    if (this.activeSource) {
      try {
        this.activeSource.stop();
      } catch (e) {}
      this.activeSource = null;
    }

    // Cancel speech synthesis
    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Hard stop called by ReplayEngine on scrub/reset.
   */
  public stop() {
    console.log('[RADIO] Hard stop called (scrub or pause).');
    this.stopActiveAudio();
    
    const store = useCoachingStore.getState();
    store.clearActive();
    store.setPlaybackStatus('idle');
    useCoachingStore.setState({ queue: [] });
  }
}

export const radioAudioEngine = new RadioAudioEngine();
