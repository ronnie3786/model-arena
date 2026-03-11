let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

export function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available
  }
}

export function playMove(): void {
  playTone(440, 0.1, 'sine', 0.2)
}

export function playWin(): void {
  const notes = [523.25, 659.25, 783.99, 1046.50]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.3), i * 100)
  })
}

export function playLose(): void {
  playTone(200, 0.3, 'sawtooth', 0.2)
  setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.2), 150)
}

export function playDraw(): void {
  playTone(300, 0.2, 'triangle', 0.2)
  setTimeout(() => playTone(300, 0.2, 'triangle', 0.2), 150)
}

export function playClick(): void {
  playTone(800, 0.05, 'sine', 0.1)
}

export function playCountdown(): void {
  playTone(500, 0.1, 'square', 0.15)
}

export function playReveal(): void {
  playTone(600, 0.15, 'sine', 0.2)
  setTimeout(() => playTone(800, 0.15, 'sine', 0.2), 100)
}

export function playRPSSelect(): void {
  playTone(600, 0.08, 'sine', 0.15)
}

export function playRPSWin(): void {
  const notes = [392, 523.25, 659.25, 783.99]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.15, 'sine', 0.25), i * 80)
  })
}

export function playRPSLose(): void {
  playTone(250, 0.25, 'sawtooth', 0.15)
  setTimeout(() => playTone(200, 0.3, 'sawtooth', 0.15), 200)
}

export function playRPSDraw(): void {
  playTone(350, 0.15, 'triangle', 0.2)
  setTimeout(() => playTone(350, 0.15, 'triangle', 0.2), 100)
}
