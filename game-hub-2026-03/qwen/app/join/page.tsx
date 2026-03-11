'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')
  const [playerName, setPlayerName] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    setJoining(true)
    setError('')

    try {
      const res = await fetch(`/api/rooms?action=join&roomId=${roomId}&playerName=${encodeURIComponent(playerName.trim())}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join')
        setJoining(false)
        return
      }

      const gameType = data.room.gameType
      router.push(`/games/${gameType}?roomId=${roomId}&playerId=${data.playerId}&mode=multiplayer&name=${encodeURIComponent(playerName.trim())}`)
    } catch (err) {
      setError('Failed to join room')
      setJoining(false)
    }
  }

  useEffect(() => {
    if (!roomId) {
      setError('Invalid room link')
    }
  }, [roomId])

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full animate-fade-in">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rps-purple to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join Game</h1>
            <p className="text-gray-400">Room: <span className="font-mono text-rps-purple">{roomId}</span></p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 text-red-400 text-center">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rps-purple"
              maxLength={20}
              autoFocus
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full px-6 py-4 bg-gradient-to-r from-rps-purple to-violet-600 hover:from-violet-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all"
          >
            {joining ? 'Joining...' : 'Join Game'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 px-4 py-3 text-gray-400 hover:text-white transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  )
}
