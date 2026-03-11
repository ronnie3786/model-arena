'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function RPSRoomPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedName = localStorage.getItem('playerName')
    if (storedName) {
      setPlayerName(storedName)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading && playerName) {
      router.push(`/rps?mode=multiplayer&room=${code}`)
    }
  }, [loading, playerName, code, router])

  const handleNameSubmit = () => {
    if (playerName.trim()) {
      localStorage.setItem('playerName', playerName.trim())
      router.push(`/rps?mode=multiplayer&room=${code}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!playerName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card max-w-sm w-full animate-fade-in">
          <h2 className="text-2xl font-bold mb-2 text-rps-primary">Join Game</h2>
          <p className="text-muted mb-4">Room: {code}</p>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-rps-primary mb-4"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            className="btn-primary w-full bg-rps-primary text-white"
          >
            Join Game
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted animate-pulse">Joining room...</div>
    </div>
  )
}
