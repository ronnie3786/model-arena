"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  delay = 0
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);

    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ac.currentTime + delay + duration
    );

    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration);
  } catch {
    // Audio not available
  }
}

export const sound = {
  click() {
    playTone(440, 0.08, "square", 0.15);
  },

  place() {
    playTone(523, 0.1, "triangle", 0.2);
  },

  win() {
    // Happy ascending arpeggio
    playTone(523, 0.15, "sine", 0.25, 0);
    playTone(659, 0.15, "sine", 0.25, 0.12);
    playTone(784, 0.15, "sine", 0.25, 0.24);
    playTone(1047, 0.3, "sine", 0.3, 0.36);
  },

  lose() {
    // Descending sad tones
    playTone(392, 0.15, "sine", 0.2, 0);
    playTone(330, 0.15, "sine", 0.2, 0.15);
    playTone(262, 0.3, "sine", 0.2, 0.3);
  },

  draw() {
    playTone(440, 0.1, "triangle", 0.2, 0);
    playTone(440, 0.1, "triangle", 0.2, 0.15);
  },

  countdown() {
    playTone(800, 0.15, "square", 0.15);
  },

  reveal() {
    playTone(600, 0.05, "square", 0.15, 0);
    playTone(900, 0.1, "square", 0.2, 0.05);
  },

  joined() {
    playTone(523, 0.1, "sine", 0.2, 0);
    playTone(659, 0.15, "sine", 0.2, 0.1);
  },

  error() {
    playTone(200, 0.15, "sawtooth", 0.15);
  },
};
