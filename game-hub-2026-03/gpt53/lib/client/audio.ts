let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

export function playTone(freq: number, duration = 0.12, type: OscillatorType = "sine"): void {
  const context = getCtx();
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration);
}

export function moveSfx(): void {
  playTone(420, 0.1, "triangle");
}

export function winSfx(): void {
  playTone(520, 0.12, "square");
  setTimeout(() => playTone(680, 0.15, "square"), 80);
}
