'use client';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

export function playMoveSound() {
  playTone(600, 0.1, 'sine', 0.1);
}

export function playWinSound() {
  // Rising arpeggio
  playTone(523, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 200);
  setTimeout(() => playTone(1047, 0.3, 'sine', 0.15), 300);
}

export function playLoseSound() {
  playTone(400, 0.15, 'sawtooth', 0.08);
  setTimeout(() => playTone(300, 0.15, 'sawtooth', 0.08), 150);
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.08), 300);
}

export function playDrawSound() {
  playTone(440, 0.2, 'triangle', 0.1);
  setTimeout(() => playTone(440, 0.2, 'triangle', 0.1), 250);
}

export function playCountdownSound() {
  playTone(880, 0.08, 'square', 0.06);
}

export function playRevealSound() {
  playTone(1200, 0.2, 'sine', 0.12);
}

export function playClickSound() {
  playTone(800, 0.05, 'sine', 0.08);
}
