'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function WaitingRoomContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomId = searchParams.get('roomId')
  const playerId = searchParams.get('playerId')
  const playerName = searchParams.get('name')
  const gameType = searchParams.get('game')
  
  const [timeLeft, setTimeLeft] = useState(120)
  const [copied, setCopied] = useState(false)
  const [waiting, setWaiting] = useState(true)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/join?roomId=${roomId}`)
    }
  }, [roomId])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const eventSource = new EventSource(`/api/sse?roomId=${roomId}`)
    
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'game-start') {
        setWaiting(false)
        eventSource.close()
        router.push(`/games/${gameType}?roomId=${roomId}&playerId=${playerId}&mode=multiplayer&name=${encodeURIComponent(playerName || '')}`)
      }
      
      if (message.type === 'player-left') {
        router.push('/')
      }
    }

    return () => {
      clearInterval(timer)
      eventSource.close()
    }
  }, [roomId, playerId, playerName, gameType, router])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center animate-fade-in">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-12">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-ttt-green to-emerald-600 rounded-2xl flex items-center justify-center animate-pulse-slow">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2 text-white">Waiting for Opponent</h1>
            <p className="text-gray-400">Share this code with your friend</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 mb-8">
            <div className="text-5xl font-mono font-bold text-ttt-green tracking-wider mb-2">
              {roomId}
            </div>
            <p className="text-sm text-gray-500">Room Code</p>
          </div>

          <div className="flex gap-3 mb-8">
            <button
              onClick={copyLink}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-ttt-green to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-white font-semibold transition-all"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.share) {
                  navigator.share({
                    title: 'Join my game!',
                    text: `Join me in ${gameType === 'tic-tac-toe' ? 'Tic-Tac-Toe' : 'Rock Paper Scissors'}!`,
                    url: shareUrl,
                  })
                }
              }}
              className="px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold transition-all"
            >
              Share
            </button>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <p className="text-gray-400 mb-2">Room expires in</p>
            <div className={`text-4xl font-mono font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-white'}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Waiting for player 2...</span>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function WaitingRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <WaitingRoomContent />
    </Suspense>
  )
}
