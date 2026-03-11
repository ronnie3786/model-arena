let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

export function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not supported
  }
}

export function playMoveSound(): void {
  playTone(440, 0.1);
}

export function playWinSound(): void {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.15), 100);
  setTimeout(() => playTone(784, 0.2), 200);
}

export function playLoseSound(): void {
  playTone(200, 0.3);
}

export function playDrawSound(): void {
  playTone(300, 0.2);
}

export function playClickSound(): void {
  playTone(600, 0.05, 'square');
}

export function playCountdownSound(): void {
  playTone(800, 0.1);
}

export function playRevealSound(): void {
  playTone(400, 0.3);
}
