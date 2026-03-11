'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [showNameInput, setShowNameInput] = useState<{game: string, mode: string} | null>(null)

  const handleGameSelect = (game: string, mode: string) => {
    if (!playerName.trim()) {
      setShowNameInput({ game, mode })
      return
    }
    startGame(game, mode)
  }

  const startGame = async (game: string, mode: string) => {
    const name = playerName.trim() || `Player ${Math.floor(Math.random() * 1000)}`
    
    if (mode === 'ai') {
      router.push(`/${game}?mode=ai&name=${encodeURIComponent(name)}`)
    } else {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType: game, mode: 'multiplayer', playerName: name }),
      })
      const data = await res.json()
      router.push(`/waiting?roomId=${data.roomId}&playerId=${data.playerId}&name=${encodeURIComponent(name)}&game=${game}`)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-ttt-green to-rps-purple bg-clip-text text-transparent">
            Game Hub
          </h1>
          <p className="text-xl text-gray-400 mb-8">Choose your game and mode</p>
          
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              placeholder="Enter your name (optional)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ttt-green transition-all"
              maxLength={20}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <GameCard
            title="Tic-Tac-Toe"
            description="Classic 3x3 grid game"
            color="from-emerald-500 to-teal-600"
            icon={
              <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                <line x1="33" y1="10" x2="33" y2="90" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <line x1="67" y1="10" x2="67" y2="90" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <line x1="10" y1="33" x2="90" y2="33" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <line x1="10" y1="67" x2="90" y2="67" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <path d="M20 20 L45 45 M45 20 L20 45" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                <circle cx="70" cy="70" r="15" stroke="currentColor" strokeWidth="8"/>
              </svg>
            }
            onPlayAI={() => handleGameSelect('tic-tac-toe', 'ai')}
            onPlayFriend={() => handleGameSelect('tic-tac-toe', 'multiplayer')}
          />

          <GameCard
            title="Rock Paper Scissors"
            description="Best of 5 showdown"
            color="from-purple-500 to-violet-600"
            icon={
              <svg className="w-24 h-24" viewBox="0 0 100 100" fill="none">
                <circle cx="30" cy="30" r="20" stroke="currentColor" strokeWidth="6"/>
                <rect x="55" y="10" width="30" height="40" rx="8" stroke="currentColor" strokeWidth="6"/>
                <polygon points="50,70 30,90 70,90" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"/>
              </svg>
            }
            onPlayAI={() => handleGameSelect('rock-paper-scissors', 'ai')}
            onPlayFriend={() => handleGameSelect('rock-paper-scissors', 'multiplayer')}
          />
        </div>

        {showNameInput && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-slate-800 p-8 rounded-2xl max-w-md w-full mx-4 border border-slate-700">
              <h3 className="text-2xl font-bold mb-4 text-white">Enter Your Name</h3>
              <input
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ttt-green mb-4"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && startGame(showNameInput.game, showNameInput.mode)}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNameInput(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => startGame(showNameInput.game, showNameInput.mode)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-ttt-green to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg text-white font-semibold transition-all"
                >
                  Play
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

interface GameCardProps {
  title: string
  description: string
  color: string
  icon: React.ReactNode
  onPlayAI: () => void
  onPlayFriend: () => void
}

function GameCard({ title, description, color, icon, onPlayAI, onPlayFriend }: GameCardProps) {
  const colorMap: Record<string, string> = {
    'from-emerald-500 to-teal-600': 'text-emerald-500',
    'from-purple-500 to-violet-600': 'text-purple-500',
  }
  const iconColor = colorMap[color] || 'text-gray-400'

  return (
    <div className={`backdrop-blur border border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300 animate-slide-up bg-gradient-to-br ${color}`}>
      <div className={`${iconColor} mb-6`}>
        {icon}
      </div>
      <h2 className="text-3xl font-bold mb-2 text-white">{title}</h2>
      <p className="text-gray-400 mb-6">{description}</p>
      <div className="flex gap-4">
        <button
          onClick={onPlayAI}
          className={`flex-1 px-6 py-4 bg-gradient-to-r ${color} hover:opacity-90 rounded-xl text-white font-semibold transition-all transform hover:scale-105`}
        >
          Play vs AI
        </button>
        <button
          onClick={onPlayFriend}
          className="flex-1 px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-all transform hover:scale-105"
        >
          Play with Friend
        </button>
      </div>
    </div>
  )
}
