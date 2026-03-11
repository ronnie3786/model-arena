"use client";

import { useCallback, useRef } from "react";

export function useSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!contextRef.current) {
      contextRef.current = new window.AudioContext();
    }
    return contextRef.current;
  }, []);

  const tone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine") => {
    const context = ensureContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [ensureContext]);

  return {
    playMove: () => tone(440, 0.12, "triangle"),
    playWin: () => {
      tone(660, 0.12, "square");
      setTimeout(() => tone(880, 0.16, "square"), 80);
    },
    playReveal: () => tone(520, 0.18, "sawtooth"),
  };
}
