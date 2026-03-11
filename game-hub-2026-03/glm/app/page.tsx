'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { playClick } from '@/lib/sound'

export default function Lobby() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [showNameInput, setShowNameInput] = useState<string | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('playerName')
    if (name) setPlayerName(name)
  }, [])

  const handleGameAction = (game: 'tictactoe' | 'rps', mode: 'ai' | 'multiplayer') => {
    playClick()
    
    if (mode === 'ai') {
      if (!playerName) {
        setShowNameInput(`${game}-ai`)
        return
      }
      router.push(`/${game}?mode=ai`)
    } else {
      if (!playerName) {
        setShowNameInput(`${game}-multiplayer`)
        return
      }
      router.push(`/${game}?mode=multiplayer`)
    }
  }

  const handleNameSubmit = () => {
    if (playerName.trim()) {
      localStorage.setItem('playerName', playerName.trim())
      const [game, mode] = (showNameInput?.split('-') || []) as ['tictactoe' | 'rps', 'ai' | 'multiplayer']
      setShowNameInput(null)
      router.push(`/${game}?mode=${mode}`)
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-2 bg-gradient-to-r from-ttt-primary to-rps-primary bg-clip-text text-transparent">
          Game Hub
        </h1>
        <p className="text-muted text-center mb-12 text-lg">Play with friends or challenge the AI</p>

        <div className="grid md:grid-cols-2 gap-8">
          <GameCard
            title="Tic-Tac-Toe"
            description="Classic X and O battle. Outsmart your opponent!"
            accentColor="ttt"
            onPlayAI={() => handleGameAction('tictactoe', 'ai')}
            onPlayFriend={() => handleGameAction('tictactoe', 'multiplayer')}
          >
            <TicTacToePreview />
          </GameCard>

          <GameCard
            title="Rock Paper Scissors"
            description="Best of 5 series. Test your luck!"
            accentColor="rps"
            onPlayAI={() => handleGameAction('rps', 'ai')}
            onPlayFriend={() => handleGameAction('rps', 'multiplayer')}
          >
            <RPSPreview />
          </GameCard>
        </div>

        {playerName && (
          <p className="text-center text-muted mt-8">
            Playing as <span className="text-white font-semibold">{playerName}</span>
          </p>
        )}
      </div>

      {showNameInput && (
        <NameModal
          playerName={playerName}
          setPlayerName={setPlayerName}
          onSubmit={handleNameSubmit}
          onClose={() => setShowNameInput(null)}
        />
      )}
    </main>
  )
}

interface GameCardProps {
  title: string
  description: string
  accentColor: 'ttt' | 'rps'
  onPlayAI: () => void
  onPlayFriend: () => void
  children: React.ReactNode
}

function GameCard({ title, description, accentColor, onPlayAI, onPlayFriend, children }: GameCardProps) {
  const colorClass = accentColor === 'ttt' ? 'ttt' : 'rps'
  
  return (
    <div className={`card relative overflow-hidden group`}>
      <div className={`absolute inset-0 opacity-5 bg-gradient-to-br from-${colorClass}-primary to-transparent`} />
      
      <div className="relative z-10">
        <div className="h-48 md:h-64 mb-6 flex items-center justify-center rounded-lg bg-surface/50 border border-border">
          {children}
        </div>
        
        <h2 className={`text-2xl md:text-3xl font-bold mb-2 text-${colorClass}-primary`}>
          {title}
        </h2>
        <p className="text-muted mb-6">{description}</p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onPlayAI}
            className={`flex-1 btn-primary bg-${colorClass}-primary/20 text-${colorClass}-primary border border-${colorClass}-primary/30 hover:bg-${colorClass}-primary/30`}
          >
            Play vs AI
          </button>
          <button
            onClick={onPlayFriend}
            className={`flex-1 btn-primary bg-${colorClass}-primary text-black hover:bg-${colorClass}-secondary`}
          >
            Play with a Friend
          </button>
        </div>
      </div>
    </div>
  )
}

function TicTacToePreview() {
  return (
    <div className="grid grid-cols-3 gap-2 w-32 h-32">
      {['X', '', 'O', '', 'X', '', 'O', '', 'X'].map((cell, i) => (
        <div key={i} className="bg-surface border border-border rounded flex items-center justify-center text-2xl font-bold">
          {cell === 'X' && <span className="text-ttt-primary">X</span>}
          {cell === 'O' && <span className="text-ttt-secondary">O</span>}
        </div>
      ))}
    </div>
  )
}

function RPSPreview() {
  return (
    <div className="flex gap-6">
      {['🪨', '📄', '✂️'].map((emoji, i) => (
        <div key={i} className="text-4xl opacity-80 hover:opacity-100 transition-opacity cursor-pointer hover:scale-110 transform">
          {emoji}
        </div>
      ))}
    </div>
  )
}

interface NameModalProps {
  playerName: string
  setPlayerName: (name: string) => void
  onSubmit: () => void
  onClose: () => void
}

function NameModal({ playerName, setPlayerName, onSubmit, onClose }: NameModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">Enter Your Name</h3>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="Your name"
          className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-ttt-primary mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-surface">
            Cancel
          </button>
          <button onClick={onSubmit} className="flex-1 px-4 py-2 bg-ttt-primary text-black rounded-lg font-semibold hover:bg-ttt-secondary">
            Start
          </button>
        </div>
      </div>
    </div>
  )
}
