class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    endFreq: number,
    durationSec: number,
    type: OscillatorType,
    gainPeak: number,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public playMove(): void {
    this.playTone(190, 95, 0.075, 'triangle', 0.16);
    this.playTone(340, 140, 0.045, 'sine', 0.06);
  }

  public playCapture(): void {
    this.playTone(260, 72, 0.11, 'sawtooth', 0.14);
    this.playTone(520, 180, 0.07, 'triangle', 0.1);
  }

  public playCastle(): void {
    this.playTone(185, 95, 0.065, 'triangle', 0.14, 0);
    this.playTone(230, 115, 0.07, 'triangle', 0.14, 0.07);
  }

  public playCheck(): void {
    this.playTone(587.33, 440, 0.16, 'sine', 0.14, 0);
    this.playTone(880, 659.25, 0.14, 'triangle', 0.09, 0.04);
  }

  public playPromotion(): void {
    this.playTone(392, 523.25, 0.14, 'sine', 0.12, 0);
    this.playTone(523.25, 783.99, 0.18, 'triangle', 0.12, 0.07);
  }

  public playGameEnd(isWin: boolean): void {
    if (isWin) {
      this.playTone(392, 392, 0.14, 'triangle', 0.12, 0);
      this.playTone(493.88, 493.88, 0.14, 'triangle', 0.12, 0.1);
      this.playTone(587.33, 587.33, 0.24, 'sine', 0.14, 0.2);
      this.playTone(783.99, 783.99, 0.35, 'sine', 0.12, 0.32);
    } else {
      this.playTone(349.23, 311.13, 0.18, 'triangle', 0.11, 0);
      this.playTone(293.66, 220, 0.3, 'sine', 0.1, 0.14);
    }
  }

  public playLowTime(): void {
    this.playTone(760, 740, 0.045, 'sine', 0.05);
  }
}

export const soundFX = new SoundEngine();
