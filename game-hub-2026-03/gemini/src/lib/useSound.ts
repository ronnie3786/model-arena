import { useCallback, useRef } from 'react';

export function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, []);

  const playMove = useCallback(() => playTone(440, 'sine', 0.1), [playTone]);
  const playWin = useCallback(() => {
    playTone(523.25, 'triangle', 0.15); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.15), 150); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.4), 300); // G5
  }, [playTone]);
  const playLose = useCallback(() => {
    playTone(349.23, 'sawtooth', 0.2); // F4
    setTimeout(() => playTone(329.63, 'sawtooth', 0.4), 200); // E4
  }, [playTone]);
  const playDraw = useCallback(() => playTone(440, 'square', 0.3), [playTone]);

  return { playMove, playWin, playLose, playDraw };
}
