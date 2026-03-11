class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3): void {
    if (!this.enabled) return;
    this.initAudioContext();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playMove(): void {
    this.playTone(440, 0.15, 'sine', 0.2);
  }

  playWin(): void {
    this.playTone(523, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.3), 100);
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 200);
  }

  playLose(): void {
    this.playTone(300, 0.2, 'sawtooth', 0.3);
    setTimeout(() => this.playTone(250, 0.3, 'sawtooth', 0.3), 200);
  }

  playDraw(): void {
    this.playTone(440, 0.2, 'sine', 0.25);
    setTimeout(() => this.playTone(440, 0.2, 'sine', 0.25), 200);
  }

  playCountdown(count: number): void {
    const freq = 400 + count * 100;
    this.playTone(freq, 0.3, 'sine', 0.4);
  }

  playReveal(): void {
    this.playTone(600, 0.15, 'square', 0.3);
    setTimeout(() => this.playTone(800, 0.3, 'square', 0.3), 150);
  }

  playClick(): void {
    this.playTone(800, 0.05, 'sine', 0.15);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const soundManager = new SoundManager();
