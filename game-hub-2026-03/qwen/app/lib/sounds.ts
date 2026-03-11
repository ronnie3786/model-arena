export function playSound(type: 'move' | 'win' | 'lose' | 'draw' | 'countdown' | 'reveal'): void {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioContext) return
  
  const ctx = new AudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  const now = ctx.currentTime
  
  switch (type) {
    case 'move':
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, now)
      oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1)
      gainNode.gain.setValueAtTime(0.3, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      oscillator.start(now)
      oscillator.stop(now + 0.1)
      break
    
    case 'win':
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(523.25, now)
      oscillator.frequency.setValueAtTime(659.25, now + 0.1)
      oscillator.frequency.setValueAtTime(783.99, now + 0.2)
      oscillator.frequency.setValueAtTime(1046.50, now + 0.3)
      gainNode.gain.setValueAtTime(0.2, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
      oscillator.start(now)
      oscillator.stop(now + 0.5)
      break
    
    case 'lose':
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(400, now)
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3)
      gainNode.gain.setValueAtTime(0.2, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
      break
    
    case 'draw':
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, now)
      oscillator.frequency.setValueAtTime(440, now + 0.15)
      gainNode.gain.setValueAtTime(0.2, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      oscillator.start(now)
      oscillator.stop(now + 0.3)
      break
    
    case 'countdown':
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(880, now)
      gainNode.gain.setValueAtTime(0.3, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      oscillator.start(now)
      oscillator.stop(now + 0.15)
      break
    
    case 'reveal':
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(660, now)
      oscillator.frequency.setValueAtTime(880, now + 0.1)
      oscillator.frequency.setValueAtTime(1100, now + 0.2)
      gainNode.gain.setValueAtTime(0.15, now)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
      oscillator.start(now)
      oscillator.stop(now + 0.4)
      break
  }
}
