class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Safe cross-platform Vibration API wrapper.
   * Executes haptic vibration independently of AudioContext state so mobile
   * devices vibrate reliably even if audio is suspended or muted.
   */
  vibrate(pattern: number | number[]): boolean {
    if (this.isMuted) return false;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        return navigator.vibrate(pattern);
      }
    } catch {
      // Ignore if blocked by browser autoplay/user-activation policy
    }
    return false;
  }

  stopVibration(): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(0);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Haptic patterns for turn-by-turn navigation events:
   * - start: single crisp confirmation pulse [70]
   * - turn_left: two quick pulses [60, 50, 60]
   * - turn_right: one medium pulse + short pulse [110, 50, 50]
   * - floor_change (stairs / elevator): ascending triple pulse [80, 60, 120, 60, 180]
   * - step_tick: subtle micro-tick [18]
   * - qr_verified: double confirmation pulse [80, 50, 140]
   * - wrong_direction: urgent warning triple buzz [220, 90, 220, 90, 300]
   * - arrive: celebratory completion cadence [160, 80, 160, 80, 360]
   */
  vibrateNavigationStart() {
    this.vibrate([70]);
  }

  vibrateStepTransition(
    action:
      | 'start'
      | 'straight'
      | 'turn_left'
      | 'turn_right'
      | 'staircase_up'
      | 'staircase_down'
      | 'elevator_up'
      | 'elevator_down'
      | 'arrive'
  ) {
    switch (action) {
      case 'turn_left':
        this.vibrate([60, 50, 60]);
        break;
      case 'turn_right':
        this.vibrate([110, 50, 50]);
        break;
      case 'staircase_up':
      case 'staircase_down':
      case 'elevator_up':
      case 'elevator_down':
        this.vibrate([80, 60, 120, 60, 180]);
        break;
      case 'arrive':
        this.vibrate([160, 80, 160, 80, 360]);
        break;
      case 'start':
      case 'straight':
      default:
        this.vibrate([45]);
        break;
    }
  }

  vibrateFootstep() {
    this.vibrate(18);
  }

  vibrateQRConfirmed() {
    this.vibrate([80, 50, 140]);
  }

  playTurnChime(action: 'turn_left' | 'turn_right' | 'straight') {
    this.vibrateStepTransition(action);
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = action === 'turn_left' ? 520 : action === 'turn_right' ? 587.33 : 480;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.14);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch {
      // Ignored
    }
  }

  playWrongDirectionAlert() {
    // Trigger haptic alert first so it fires even if AudioContext is unavailable
    this.vibrate([220, 90, 220, 90, 300]);
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.15);
      osc.frequency.setValueAtTime(340, now + 0.2);
      osc.frequency.linearRampToValueAtTime(240, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // AudioContext could be blocked by browser policy until gesture
    }
  }

  playRecalculatingChime() {
    this.vibrate([80, 60, 120]);
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignored
    }
  }

  playArrivalChime() {
    // Trigger single consistent arrival haptic cadence first
    this.vibrate([160, 80, 160, 80, 360]);
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.12;
        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });
    } catch {
      // Ignored
    }
  }
}

export const soundEffects = new SoundEffects();
