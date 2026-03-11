'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { playSound } from '@/app/lib/sounds'
import { RPSState, RPSChoice } from '@/app/lib/types'

type Choice = 'rock' | 'paper' | 'scissors'

interface RoundResult {
  player1: Choice
  player2: Choice
  winner: 'player1' | 'player2' | 'draw'
}

function RockPaperScissorsGame() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'ai'
  const roomId = searchParams.get('roomId')
  const playerId = searchParams.get('playerId')
  const playerName = searchParams.get('name') || 'Player 1'
  
  const [playerScore, setPlayerScore] = useState(0)
  const [opponentScore, setOpponentScore] = useState(0)
  const [rounds, setRounds] = useState<RoundResult[]>([])
  const [roundWinner, setRoundWinner] = useState<'player' | 'opponent' | 'draw' | null>(null)
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null)
  const [opponentChoice, setOpponentChoice] = useState<Choice | null>(null)
  const [showingResult, setShowingResult] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [seriesWinner, setSeriesWinner] = useState<'player' | 'opponent' | null>(null)
  const [isMyTurn, setIsMyTurn] = useState(true)
  const [opponentName, setOpponentName] = useState('AI')
  const [connected, setConnected] = useState(true)
  const [showRematchRequest, setShowRematchRequest] = useState(false)
  const [rematchRequested, setRematchRequested] = useState(false)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const isMultiplayer = mode === 'multiplayer' && roomId

  useEffect(() => {
    if (isMultiplayer) {
      const eventSource = new EventSource(`/api/sse?roomId=${roomId}`)
      eventSourceRef.current = eventSource
      
      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        if (message.type === 'connected') {
          setConnected(true)
          const players = message.payload.players
          const opponent = players.find((p: any) => p.id !== playerId)
          if (opponent) setOpponentName(opponent.name)
        }
        
        if (message.type === 'player-left') {
          setConnected(false)
        }
        
        if (message.type === 'game-state') {
          const state = message.payload.gameState as RPSState
          setPlayerScore(state.player1Score)
          setOpponentScore(state.player2Score)
          const typedRounds = state.rounds.map(r => ({
            player1: (r as any).player1 || (r as any).player1Choice,
            player2: (r as any).player2 || (r as any).player2Choice,
            winner: (r as any).winner,
          }) as RoundResult)
          setRounds(typedRounds)
          setIsMyTurn(!state.bothChosen && !state.player1Choice)
          
          if (state.bothChosen && state.player1Choice && state.player2Choice) {
            setPlayerChoice(state.player1Choice)
            setOpponentChoice(state.player2Choice)
          }
        }
        
        if (message.type === 'rematch-request') {
          setShowRematchRequest(true)
        }
        
        if (message.type === 'rematch-accepted') {
          const state = message.payload.gameState as RPSState
          setPlayerScore(state.player1Score)
          setOpponentScore(state.player2Score)
          const typedRounds = state.rounds.map(r => ({
            player1: (r as any).player1 || (r as any).player1Choice,
            player2: (r as any).player2 || (r as any).player2Choice,
            winner: (r as any).winner,
          }) as RoundResult)
          setRounds(typedRounds)
          setPlayerChoice(null)
          setOpponentChoice(null)
          setRoundWinner(null)
          setShowingResult(false)
          setSeriesWinner(null)
          setRematchRequested(false)
          setShowRematchRequest(false)
          setIsMyTurn(true)
        }
      }
      
      eventSource.onerror = () => {
        setConnected(false)
      }
      
      return () => {
        eventSource.close()
      }
    }
  }, [isMultiplayer, roomId, playerId])

  const determineWinner = (choice1: Choice, choice2: Choice): 'player1' | 'player2' | 'draw' => {
    if (choice1 === choice2) return 'draw'
    if (
      (choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'paper' && choice2 === 'rock') ||
      (choice1 === 'scissors' && choice2 === 'paper')
    ) {
      return 'player1'
    }
    return 'player2'
  }

  const makeChoice = async (choice: Choice) => {
    if (playerChoice || seriesWinner) return
    
    setPlayerChoice(choice)
    playSound('move')
    
    if (mode === 'ai') {
      const choices: Choice[] = ['rock', 'paper', 'scissors']
      const aiChoice = choices[Math.floor(Math.random() * choices.length)]
      
      setCountdown(3)
      playSound('countdown')
      
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval)
            return null
          }
          playSound('countdown')
          return prev - 1
        })
      }, 800)
      
      setTimeout(() => {
        setOpponentChoice(aiChoice)
        setShowingResult(true)
        playSound('reveal')
        
        const winner = determineWinner(choice, aiChoice)
        setRoundWinner(winner === 'player1' ? 'player' : winner === 'player2' ? 'opponent' : 'draw')
        
        const newRounds = [...rounds, { player1: choice, player2: aiChoice, winner }]
        setRounds(newRounds)
        
        let newPlayerScore = playerScore
        let newOpponentScore = opponentScore
        
        if (winner === 'player1') newPlayerScore++
        else if (winner === 'player2') newOpponentScore++
        
        setPlayerScore(newPlayerScore)
        setOpponentScore(newOpponentScore)
        
        if (newPlayerScore >= 3 || newOpponentScore >= 3) {
          setSeriesWinner(newPlayerScore > newOpponentScore ? 'player' : 'opponent')
          playSound(newPlayerScore > newOpponentScore ? 'win' : 'lose')
        }
        
        if (isMultiplayer && roomId) {
          fetch('/api/game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId,
              action: 'update',
              playerId,
              gameState: {
                player1Score: newPlayerScore,
                opponentScore: newOpponentScore,
                player2Score: newOpponentScore,
                rounds: newRounds,
                currentRound: newRounds.length + 1,
                winner: newPlayerScore >= 3 ? 'player1' : newOpponentScore >= 3 ? 'player2' : null,
                player1Choice: choice,
                player2Choice: aiChoice,
                bothChosen: true,
              },
            }),
          })
        }
      }, 2500)
    } else if (isMultiplayer && roomId) {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'update',
          playerId,
          gameState: {
            player1Score: playerScore,
            player2Score: opponentScore,
            rounds,
            currentRound: rounds.length + 1,
            winner: null,
            player1Choice: choice,
            player2Choice: null,
            bothChosen: false,
          },
        }),
      })
      
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/rooms?roomId=${roomId}`)
          const data = await res.json()
          
          if (data.room?.gameState?.bothChosen) {
            clearInterval(pollInterval)
            
            const oppChoice = data.room.gameState.player2Choice as Choice
            const myChoice = data.room.gameState.player1Choice as Choice
            
            setOpponentChoice(oppChoice)
            setShowingResult(true)
            playSound('reveal')
            
            const winner = determineWinner(myChoice, oppChoice)
            setRoundWinner(winner === 'player1' ? 'player' : winner === 'player2' ? 'opponent' : 'draw')
            
            const newRounds = [...rounds, { player1: myChoice, player2: oppChoice, winner }]
            setRounds(newRounds)
            
            let newPlayerScore = playerScore
            let newOpponentScore = opponentScore
            
            if (winner === 'player1') newPlayerScore++
            else if (winner === 'player2') newOpponentScore++
            
            setPlayerScore(newPlayerScore)
            setOpponentScore(newOpponentScore)
            
            if (newPlayerScore >= 3 || newOpponentScore >= 3) {
              setSeriesWinner(newPlayerScore > newOpponentScore ? 'player' : 'opponent')
              playSound(newPlayerScore > newOpponentScore ? 'win' : 'lose')
            }
          }
        } catch (err) {
          console.error('Poll error:', err)
        }
      }, 500)
    }
  }

  const playAgain = () => {
    setPlayerScore(0)
    setOpponentScore(0)
    setRounds([])
    setPlayerChoice(null)
    setOpponentChoice(null)
    setRoundWinner(null)
    setShowingResult(false)
    setSeriesWinner(null)
    setRematchRequested(false)
    setShowRematchRequest(false)
    setIsMyTurn(true)
    
    if (isMultiplayer && roomId) {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'rematch',
          playerId,
          gameState: {
            player1Score: 0,
            player2Score: 0,
            rounds: [],
            currentRound: 1,
            winner: null,
            player1Choice: null,
            player2Choice: null,
            bothChosen: false,
          },
        }),
      })
    }
  }

  const handleRematchResponse = (accept: boolean) => {
    if (accept && roomId) {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'rematch',
          playerId,
          gameState: {
            player1Score: 0,
            player2Score: 0,
            rounds: [],
            currentRound: 1,
            winner: null,
            player1Choice: null,
            player2Choice: null,
            bothChosen: false,
          },
        }),
      })
      setRematchRequested(true)
    }
    setShowRematchRequest(false)
  }

  const icons: Record<Choice, JSX.Element> = {
    rock: (
      <svg className="w-20 h-20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="40" />
      </svg>
    ),
    paper: (
      <svg className="w-20 h-20" viewBox="0 0 100 100" fill="currentColor">
        <rect x="20" y="20" width="60" height="60" rx="8" />
      </svg>
    ),
    scissors: (
      <svg className="w-20 h-20" viewBox="0 0 100 100" fill="currentColor">
        <polygon points="50,15 85,85 15,85" />
      </svg>
    ),
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 mb-8">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">{playerName}</div>
              <div className="text-4xl font-bold text-rps-purple">{playerScore}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">First to 3</div>
              <div className="text-lg font-semibold text-gray-500">
                {rounds.length > 0 && !seriesWinner && `Round ${rounds.length + 1}`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">{opponentName}</div>
              <div className="text-4xl font-bold text-orange-500">{opponentScore}</div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < playerScore ? 'bg-rps-purple' : 'bg-slate-700'
                }`}
              />
            ))}
            <div className="w-8" />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < opponentScore ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {!seriesWinner && !showingResult && (
            <>
              {countdown !== null ? (
                <div className="text-center py-12">
                  <div className="text-9xl font-bold text-rps-purple countdown-digit">
                    {countdown || 'GO!'}
                  </div>
                </div>
              ) : !playerChoice ? (
                <div className="text-center">
                  <p className="text-xl text-gray-300 mb-8">
                    {isMultiplayer ? (isMyTurn ? 'Choose your weapon!' : 'Waiting for opponent...') : 'Choose your weapon!'}
                  </p>
                  <div className="flex justify-center gap-6">
                    {(['rock', 'paper', 'scissors'] as Choice[]).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => makeChoice(choice)}
                        disabled={!isMyTurn}
                        className={`w-32 h-32 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isMyTurn
                            ? 'bg-gradient-to-br from-rps-purple to-purple-700 hover:scale-110 hover:from-purple-600 hover:to-purple-800 cursor-pointer'
                            : 'bg-slate-700 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {icons[choice]}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-center gap-8 mt-8 text-gray-400">
                    <span>Rock</span>
                    <span>Paper</span>
                    <span>Scissors</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-2xl text-gray-300">Waiting for opponent...</div>
                </div>
              )}
            </>
          )}

          {showingResult && !seriesWinner && (
            <div className="text-center animate-fade-in">
              <div className="flex justify-center items-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-8xl text-rps-purple mb-2">
                    {playerChoice && icons[playerChoice]}
                  </div>
                  <div className="text-lg text-gray-400">You</div>
                </div>
                <div className="text-4xl font-bold text-gray-500">VS</div>
                <div className="text-center">
                  <div className="text-8xl text-orange-500 mb-2">
                    {opponentChoice && icons[opponentChoice]}
                  </div>
                  <div className="text-lg text-gray-400">{opponentName}</div>
                </div>
              </div>
              
              <div className={`text-4xl font-bold mb-8 ${
                roundWinner === 'player' ? 'text-green-500' :
                roundWinner === 'opponent' ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {roundWinner === 'player' ? 'You Win!' :
                 roundWinner === 'opponent' ? 'You Lose!' : 'Draw!'}
              </div>

              {playerScore < 3 && opponentScore < 3 ? (
                <button
                  onClick={() => {
                    setPlayerChoice(null)
                    setOpponentChoice(null)
                    setRoundWinner(null)
                    setShowingResult(false)
                    setIsMyTurn(true)
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-rps-purple to-violet-600 hover:from-violet-600 hover:to-violet-700 rounded-xl text-white font-semibold transition-all"
                >
                  Next Round
                </button>
              ) : null}
            </div>
          )}

          {seriesWinner && (
            <div className="text-center animate-fade-in">
              <div className={`text-5xl font-bold mb-8 ${
                seriesWinner === 'player' ? 'text-green-500' : 'text-red-500'
              }`}>
                {seriesWinner === 'player' ? '🎉 You Win the Series!' : `💀 ${opponentName} Wins!`}
              </div>
              
              <div className="text-2xl text-gray-300 mb-8">
                Final Score: {playerScore} - {opponentScore}
              </div>
              
              <button
                onClick={playAgain}
                className="px-8 py-4 bg-gradient-to-r from-rps-purple to-violet-600 hover:from-violet-600 hover:to-violet-700 rounded-xl text-white font-semibold transition-all"
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {showRematchRequest && !rematchRequested && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">{opponentName} wants a rematch!</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => handleRematchResponse(true)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-rps-purple to-violet-600 rounded-xl text-white font-semibold"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRematchResponse(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {rematchRequested && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded-xl px-6 py-4 text-white animate-fade-in">
            Waiting for opponent...
          </div>
        )}

        {!connected && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 rounded-xl px-6 py-4 text-white font-semibold animate-fade-in">
            Opponent disconnected
          </div>
        )}
      </div>
    </main>
  )
}

export default function RockPaperScissorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <RockPaperScissorsGame />
    </Suspense>
  )
}
