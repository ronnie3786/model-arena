'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  RPSState, 
  createRPSInitialState, 
  makeRPSChoice, 
  resolveRound, 
  nextRound, 
  resetRPSSeries,
  getAIChoice,
  determineWinner,
  Choice
} from '@/lib/rps'
import { playCountdown, playReveal, playRPSWin, playRPSLose, playRPSDraw, playRPSSelect } from '@/lib/sound'
import { Room } from '@/lib/rooms'

export default function RPSGameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') as 'ai' | 'multiplayer' | null
  const roomCode = searchParams.get('room')
  
  const [playerName, setPlayerName] = useState('')
  const [gameState, setGameState] = useState<RPSState | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120)
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 15))
  const [copiedLink, setCopiedLink] = useState(false)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('playerName') || 'Player'
    setPlayerName(name)
    
    if (mode === 'ai') {
      setGameState(createRPSInitialState(name, 'AI', false, 1))
    } else if (mode === 'multiplayer' && roomCode) {
      joinRoom(roomCode.toUpperCase(), name)
    }
  }, [mode, roomCode])

  useEffect(() => {
    if (mode === 'multiplayer' && !roomCode) {
      const name = localStorage.getItem('playerName') || 'Player'
      createRoom(name)
    }
  }, [mode, roomCode])

  const createRoom = async (name: string) => {
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'rps', playerName: name, playerId }),
    })
    const data = await res.json()
    setRoom(data.room)
    setIsWaiting(true)
    setTimeLeft(120)
    connectSSE(data.code)
  }

  const joinRoom = async (code: string, name: string) => {
    const res = await fetch(`/api/room/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', playerId, playerName: name }),
    })
    const data = await res.json()
    
    if (data.room) {
      setRoom(data.room)
      const myNumber = data.room.players.find((p: { id: string }) => p.id === playerId)?.playerNumber as 1 | 2
      setGameState(createRPSInitialState(
        data.room.players[0]?.name || 'Player 1',
        data.room.players[1]?.name || 'Player 2',
        true,
        myNumber
      ))
      connectSSE(code)
    } else {
      alert('Room not found or full')
      router.push('/')
    }
  }

  const connectSSE = (code: string) => {
    const eventSource = new EventSource(`/api/room/${code}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'connected') {
        setRoom(data.room)
      } else if (data.type === 'player-joined') {
        setRoom(data.room)
        setIsWaiting(false)
        const myNumber = data.room.players.find((p: { id: string }) => p.id === playerId)?.playerNumber as 1 | 2
        setGameState(createRPSInitialState(
          data.room.players[0].name,
          data.room.players[1].name,
          true,
          myNumber
        ))
      } else if (data.type === 'state-update') {
        if (data.playerId !== playerId && gameState) {
          const round = data.state.currentRound - 1
          const isPlayer1 = gameState.playerNumber === 1
          
          if (isPlayer1 ? data.state.player2Choice : data.state.player1Choice) {
            setGameState(prev => {
              if (!prev) return prev
              const newRounds = [...prev.rounds]
              newRounds[round] = { ...newRounds[round] }
              if (isPlayer1) {
                newRounds[round].player2Choice = data.state.player2Choice
              } else {
                newRounds[round].player1Choice = data.state.player1Choice
              }
              return { ...prev, rounds: newRounds, opponentChoice: data.state.opponentChoice }
            })
            
            checkAndResolve(gameState, data.state)
          }
        }
      } else if (data.type === 'rematch-vote') {
        if (data.playerId !== playerId) {
          setGameState(prev => prev ? { ...prev, opponentRematchRequested: true } : null)
        }
        if (data.rematchVotes?.length >= 2) {
          handleRematchConfirmed()
        }
      } else if (data.type === 'clear-rematch') {
        setGameState(prev => prev ? { 
          ...prev, 
          rematchRequested: false, 
          opponentRematchRequested: false 
        } : null)
      }
    }

    eventSource.onerror = () => {
      setOpponentDisconnected(true)
    }
  }

  useEffect(() => {
    if (!isWaiting) return
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          alert('Room expired. No player joined.')
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isWaiting, router])

  const checkAndResolve = useCallback((currentState: RPSState, incomingState: { player1Choice?: Choice; player2Choice?: Choice; opponentChoice?: Choice }) => {
    const roundIndex = currentState.currentRound - 1
    const currentRound = currentState.rounds[roundIndex]
    
    const player1Choice = currentState.playerNumber === 1 ? currentRound.player1Choice : incomingState.player1Choice
    const player2Choice = currentState.playerNumber === 2 ? currentRound.player2Choice : incomingState.player2Choice
    
    if (player1Choice && player2Choice) {
      runRevealSequence(player1Choice, player2Choice, currentState)
    }
  }, [])

  const runRevealSequence = async (player1Choice: Choice, player2Choice: Choice, currentState: RPSState) => {
    setShowResult(true)
    
    for (let i = 3; i >= 1; i--) {
      playCountdown()
      await new Promise(resolve => setTimeout(resolve, 800))
    }
    
    playReveal()
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const resolvedState = resolveRound({
      ...currentState,
      rounds: currentState.rounds.map((r, i) => 
        i === currentState.currentRound - 1 
          ? { player1Choice, player2Choice, result: determineWinner(player1Choice, player2Choice) }
          : r
      ),
    } as RPSState)
    
    const isPlayer1 = currentState.playerNumber === 1
    const result = determineWinner(player1Choice, player2Choice)
    const myResult = isPlayer1 ? result : result === 'draw' ? 'draw' : result === 'win' ? 'lose' : 'win'
    
    if (myResult === 'win') playRPSWin()
    else if (myResult === 'lose') playRPSLose()
    else playRPSDraw()
    
    setGameState(resolvedState)
    
    if (!resolvedState.gameComplete) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setGameState(prev => prev ? nextRound(prev) : null)
      setShowResult(false)
    }
  }

  const handleChoice = useCallback((choice: Choice) => {
    if (!gameState || gameState.revealPhase || showResult) return
    if (gameState.currentChoice) return
    
    playRPSSelect()
    
    const isPlayer1 = gameState.playerNumber === 1
    const newState = makeRPSChoice(gameState, choice, isPlayer1)
    setGameState(newState)
    
    if (gameState.isMultiplayer && room) {
      fetch(`/api/room/${room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-state',
          playerId,
          gameState: {
            currentRound: newState.currentRound,
            player1Choice: isPlayer1 ? choice : null,
            player2Choice: !isPlayer1 ? choice : null,
            opponentChoice: choice,
          },
        }),
      })
    }
    
    if (!gameState.isMultiplayer) {
      const aiChoice = getAIChoice()
      setTimeout(() => {
        runRevealSequence(choice, aiChoice, gameState)
      }, 500)
    } else {
      const roundIndex = gameState.currentRound - 1
      const currentRound = gameState.rounds[roundIndex]
      const opponentChoice = isPlayer1 ? currentRound.player2Choice : currentRound.player1Choice
      
      if (opponentChoice) {
        runRevealSequence(
          isPlayer1 ? choice : opponentChoice,
          isPlayer1 ? opponentChoice : choice,
          gameState
        )
      }
    }
  }, [gameState, playerId, room, showResult, runRevealSequence])

  const handlePlayAgain = () => {
    if (!gameState) return
    
    if (gameState.isMultiplayer && room) {
      setGameState(prev => prev ? { ...prev, rematchRequested: true } : null)
      fetch(`/api/room/${room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rematch', playerId }),
      })
    } else {
      setGameState(resetRPSSeries(gameState))
    }
  }

  const handleRematchConfirmed = () => {
    if (gameState) {
      const reset = resetRPSSeries(gameState)
      setGameState(reset)
      setShowResult(false)
      
      if (room) {
        fetch(`/api/room/${room.code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-rematch', playerId }),
        })
      }
    }
  }

  const copyLink = () => {
    const link = `${window.location.origin}/rps?room=${room?.code}`
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (isWaiting && room) {
    return (
      <WaitingRoom
        roomCode={room.code}
        timeLeft={timeLeft}
        copiedLink={copiedLink}
        onCopyLink={copyLink}
        onCancel={() => router.push('/')}
      />
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <GameBoard
      gameState={gameState}
      playerName={playerName}
      showResult={showResult}
      onChoice={handleChoice}
      onPlayAgain={handlePlayAgain}
      onBack={() => router.push('/')}
      opponentDisconnected={opponentDisconnected}
    />
  )
}

interface WaitingRoomProps {
  roomCode: string
  timeLeft: number
  copiedLink: boolean
  onCopyLink: () => void
  onCancel: () => void
}

function WaitingRoom({ roomCode, timeLeft, copiedLink, onCopyLink, onCancel }: WaitingRoomProps) {
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-rps-primary">Waiting for Opponent</h2>
        
        <div className="mb-8">
          <p className="text-muted mb-2">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-white mb-4">{roomCode}</p>
        </div>
        
        <button
          onClick={onCopyLink}
          className="btn-primary w-full bg-rps-primary text-white mb-4"
        >
          {copiedLink ? 'Link Copied!' : 'Copy Link'}
        </button>
        
        <div className="text-muted mb-6">
          <p>Expires in</p>
          <p className="text-2xl font-mono text-white">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>
        
        <button onClick={onCancel} className="text-muted hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

interface GameBoardProps {
  gameState: RPSState
  playerName: string
  showResult: boolean
  onChoice: (choice: Choice) => void
  onPlayAgain: () => void
  onBack: () => void
  opponentDisconnected: boolean
}

function GameBoard({ gameState, playerName, showResult, onChoice, onPlayAgain, onBack, opponentDisconnected }: GameBoardProps) {
  const { 
    rounds, 
    currentRound, 
    player1Score, 
    player2Score, 
    player1Name, 
    player2Name, 
    isMultiplayer, 
    playerNumber,
    currentChoice,
    gameComplete,
    seriesWinner,
    rematchRequested,
    opponentRematchRequested
  } = gameState
  
  const currentRoundData = rounds[currentRound - 1]
  const isPlayer1 = playerNumber === 1
  const myScore = isPlayer1 ? player1Score : player2Score
  const opponentScore = isPlayer1 ? player2Score : player1Score
  const myName = isPlayer1 ? player1Name : player2Name
  const opponentName = isPlayer1 ? player2Name : player1Name
  const myChoice = currentChoice
  const opponentChoice = currentRoundData ? (isPlayer1 ? currentRoundData.player2Choice : currentRoundData.player1Choice) : null
  const showRematchButton = gameComplete && (isMultiplayer ? !rematchRequested : true)
  const bothWantRematch = rematchRequested && opponentRematchRequested

  const getResultText = () => {
    if (!currentRoundData?.result) return null
    const result = isPlayer1 ? currentRoundData.result : currentRoundData.result === 'win' ? 'lose' : currentRoundData.result === 'lose' ? 'win' : 'draw'
    return result
  }

  const result = getResultText()

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <button onClick={onBack} className="text-muted hover:text-white mb-6 transition-colors">
          ← Back to Lobby
        </button>
        
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-rps-primary">Rock Paper Scissors</h2>
              <p className="text-sm text-muted">Best of 5 • Round {currentRound}</p>
            </div>
            {isMultiplayer && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${opponentDisconnected ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-xs text-muted">
                  {opponentDisconnected ? 'Disconnected' : 'Connected'}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="text-center">
              <p className="text-sm text-muted">{myName} (You)</p>
              <p className="text-3xl font-bold text-rps-primary">{myScore}</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(round => (
                <div 
                  key={round}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                    ${round < currentRound || (round === currentRound && result) 
                      ? rounds[round - 1]?.result === 'draw' 
                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500'
                        : (isPlayer1 && rounds[round - 1]?.result === 'win') || (!isPlayer1 && rounds[round - 1]?.result === 'lose')
                          ? 'border-green-500 bg-green-500/20 text-green-500'
                          : (isPlayer1 && rounds[round - 1]?.result === 'lose') || (!isPlayer1 && rounds[round - 1]?.result === 'win')
                            ? 'border-red-500 bg-red-500/20 text-red-500'
                            : 'border-muted'
                        : round === currentRound 
                          ? 'border-rps-primary' 
                          : 'border-muted'
                    }`}
                >
                  {round}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted">{opponentName}</p>
              <p className="text-3xl font-bold text-white">{opponentScore}</p>
            </div>
          </div>
          
          {opponentDisconnected ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-xl font-bold mb-4">Opponent Disconnected</p>
              <button onClick={onBack} className="btn-primary bg-rps-primary text-white">
                Return to Lobby
              </button>
            </div>
          ) : gameComplete ? (
            <div className="text-center py-8">
              <p className="text-2xl font-bold mb-2">
                {seriesWinner === playerNumber ? (
                  <span className="text-green-500">You Win the Series!</span>
                ) : (
                  <span className="text-red-500">You Lose the Series!</span>
                )}
              </p>
              <p className="text-muted mb-6">
                Final Score: {myScore} - {opponentScore}
              </p>
              
              {rematchRequested && !bothWantRematch && (
                <p className="text-muted mb-4">
                  {opponentRematchRequested ? 'Accepting rematch...' : 'Waiting for opponent...'}
                </p>
              )}
              
              {showRematchButton && (
                <button onClick={onPlayAgain} className="btn-primary bg-rps-primary text-white">
                  {isMultiplayer ? 'Request Rematch' : 'Play Again'}
                </button>
              )}
            </div>
          ) : showResult ? (
            <div className="text-center py-8">
              <div className="flex justify-center gap-12 mb-8">
                <div className="text-center">
                  <p className="text-sm text-muted mb-2">{myName}</p>
                  <div className="w-20 h-20 bg-surface border border-border rounded-xl flex items-center justify-center text-4xl animate-scale-in">
                    {myChoice === 'rock' && '🪨'}
                    {myChoice === 'paper' && '📄'}
                    {myChoice === 'scissors' && '✂️'}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted mb-2">{opponentName}</p>
                  <div className="w-20 h-20 bg-surface border border-border rounded-xl flex items-center justify-center text-4xl animate-scale-in">
                    {opponentChoice === 'rock' && '🪨'}
                    {opponentChoice === 'paper' && '📄'}
                    {opponentChoice === 'scissors' && '✂️'}
                  </div>
                </div>
              </div>
              {result && (
                <p className={`text-2xl font-bold animate-slide-up
                  ${result === 'win' ? 'text-green-500' : result === 'lose' ? 'text-red-500' : 'text-yellow-500'}
                `}>
                  {result === 'win' && 'You Win!'}
                  {result === 'lose' && 'You Lose!'}
                  {result === 'draw' && 'Draw!'}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-4">
                {currentChoice ? (
                  <p className="text-muted">Waiting for opponent...</p>
                ) : (
                  <p className="text-muted">Choose your weapon!</p>
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                  <button
                    key={choice}
                    onClick={() => onChoice(choice)}
                    disabled={!!currentChoice}
                    className={`w-24 h-24 md:w-28 md:h-28 bg-surface border-2 rounded-xl flex items-center justify-center text-5xl md:text-6xl transition-all duration-200
                      ${!currentChoice 
                        ? 'hover:bg-rps-primary/10 hover:border-rps-primary hover:scale-110 cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                      }
                      ${currentChoice === choice ? 'border-rps-primary bg-rps-primary/20' : 'border-border'}
                    `}
                  >
                    {choice === 'rock' && '🪨'}
                    {choice === 'paper' && '📄'}
                    {choice === 'scissors' && '✂️'}
                  </button>
                ))}
              </div>
              
              {currentChoice && (
                <div className="text-center mt-6">
                  <p className="text-rps-primary font-semibold">
                    You chose: {currentChoice === 'rock' ? '🪨 Rock' : currentChoice === 'paper' ? '📄 Paper' : '✂️ Scissors'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
