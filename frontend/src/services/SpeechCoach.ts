import { CoachingEvent } from '../types/coaching';
import { useReplayStore } from '../store/replayStore';

class SpeechCoach {
  private speaking = false;
  private lastSpokenId: string | null = null;
  private lastSpeakTime = 0;
  private unsubEvent: (() => void) | null = null;
  private unsubPlay: (() => void) | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private voiceResolved = false;

  private static readonly COOLDOWN_MS = 8000;
  private static readonly SPEED_SUPPRESS = 3;

  mount(): void {
    this.resolveVoice();

    this.unsubEvent = (useReplayStore as any).subscribe(
      (s: any) => s.activeCoachingEvent,
      (event: CoachingEvent | null) => { if (event) this.maybeSpeak(event); }
    );

    this.unsubPlay = (useReplayStore as any).subscribe(
      (s: any) => s.isPlaying,
      (playing: boolean) => { if (!playing) this.cancel(); }
    );
  }

  unmount(): void {
    this.cancel();
    if (this.unsubEvent) { this.unsubEvent(); this.unsubEvent = null; }
    if (this.unsubPlay) { this.unsubPlay(); this.unsubPlay = null; }
  }

  reset(): void {
    this.cancel();
    this.lastSpokenId = null;
  }

  private maybeSpeak(event: CoachingEvent): void {
    if (event.id === this.lastSpokenId) return;

    if (Date.now() - this.lastSpeakTime < SpeechCoach.COOLDOWN_MS) return;

    const speed = useReplayStore.getState().playbackSpeed;
    if (speed >= SpeechCoach.SPEED_SUPPRESS) return;

    if (this.speaking) {
      if (event.severity === 'critical') {
        this.cancel();
      } else {
        return;
      }
    }

    const rate = Math.min(Math.max(speed * 1.1, 0.8), 2.0);
    this.speak(event, rate);

    this.lastSpokenId = event.id;
    this.lastSpeakTime = Date.now();
  }

  private speak(event: CoachingEvent, rate: number): void {
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(event.message);
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (!this.voiceResolved) this.resolveVoice();
      if (this.preferredVoice) utterance.voice = this.preferredVoice;

      utterance.onstart = () => {
        this.speaking = true;
        useReplayStore.getState().setSpeechActive(true);
      };

      utterance.onend = () => {
        this.speaking = false;
        useReplayStore.getState().setSpeechActive(false);
      };

      utterance.onerror = () => {
        this.speaking = false;
        useReplayStore.getState().setSpeechActive(false);
      };

      speechSynthesis.speak(utterance);
    }, 150);
  }

  private cancel(): void {
    speechSynthesis.cancel();
    this.speaking = false;
    useReplayStore.getState().setSpeechActive(false);
  }

  private resolveVoice(): void {
    if (this.voiceResolved) return;

    const populate = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const gbVoice = voices.find(v => v.lang.startsWith('en-GB'));
      if (gbVoice) { this.preferredVoice = gbVoice; this.voiceResolved = true; return; }

      const enVoice = voices.find(v => v.lang.startsWith('en'));
      if (enVoice) { this.preferredVoice = enVoice; this.voiceResolved = true; return; }

      this.preferredVoice = voices[0] ?? null;
      this.voiceResolved = true;
    };

    populate();
    if (!this.voiceResolved) {
      speechSynthesis.onvoiceschanged = () => { populate(); };
    }
  }
}

export const speechCoach = new SpeechCoach();
