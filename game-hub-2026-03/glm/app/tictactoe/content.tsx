'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  TicTacToeState, 
  createInitialState, 
  makeMove, 
  resetGame, 
  getBestMove,
  Player
} from '@/lib/tictactoe'
import { playMove, playWin, playLose, playDraw, playClick } from '@/lib/sound'
import { Room } from '@/lib/rooms'

export default function TicTacToeGameContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode') as 'ai' | 'multiplayer' | null
  const roomCode = searchParams.get('room')
  
  const [playerName, setPlayerName] = useState('')
  const [gameState, setGameState] = useState<TicTacToeState | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120)
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 15))
  const [copiedLink, setCopiedLink] = useState(false)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const name = localStorage.getItem('playerName') || 'Player'
    setPlayerName(name)
    
    if (mode === 'ai') {
      setGameState(createInitialState(
        { X: name, O: 'AI' },
        'X'
      ))
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
      body: JSON.stringify({ game: 'tictactoe', playerName: name, playerId }),
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
      const myMark = data.room.players.find((p: { id: string }) => p.id === playerId)?.mark as Player
      setGameState(createInitialState(
        { 
          X: data.room.players[0]?.name || 'Player 1', 
          O: data.room.players[1]?.name || 'Player 2' 
        },
        myMark
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
        const myMark = data.room.players.find((p: { id: string }) => p.id === playerId)?.mark as Player
        setGameState(createInitialState(
          { X: data.room.players[0].name, O: data.room.players[1].name },
          myMark
        ))
      } else if (data.type === 'state-update') {
        if (data.playerId !== playerId) {
          setGameState(prev => prev ? { ...prev, ...data.state } : null)
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

  const handleCellClick = useCallback((index: number) => {
    if (!gameState) return
    
    if (gameState.winner) return
    
    if (gameState.isMultiplayer && gameState.playerMark !== gameState.currentTurn) return
    
    if (gameState.board[index]) return
    
    playClick()
    
    const newState = makeMove(gameState, index)
    setGameState(newState)
    
    if (newState.winner) {
      if (newState.winner === 'draw') {
        playDraw()
      } else if (gameState.isMultiplayer) {
        if (newState.winner === gameState.playerMark) {
          playWin()
        } else {
          playLose()
        }
      } else {
        if (newState.winner === 'X') {
          playWin()
        } else {
          playLose()
        }
      }
    } else {
      playMove()
    }
    
    if (gameState.isMultiplayer && room) {
      fetch(`/api/room/${room.code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-state',
          playerId,
          gameState: {
            board: newState.board,
            currentTurn: newState.currentTurn,
            winner: newState.winner,
            winningLine: newState.winningLine,
            scores: newState.scores,
          },
        }),
      })
    }
  }, [gameState, playerId, room])

  useEffect(() => {
    if (gameState && !gameState.isMultiplayer && gameState.currentTurn === 'O' && !gameState.winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove(gameState.board)
        if (aiMove !== -1) {
          const newState = makeMove(gameState, aiMove)
          setGameState(newState)
          
          if (newState.winner) {
            if (newState.winner === 'draw') {
              playDraw()
            } else {
              playLose()
            }
          }
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [gameState])

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
      setGameState(resetGame(gameState))
    }
  }

  const handleRematchConfirmed = () => {
    if (gameState) {
      const reset = resetGame(gameState)
      setGameState(reset)
      
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
    const link = `${window.location.origin}/tictactoe?room=${room?.code}`
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
      onCellClick={handleCellClick}
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
        <h2 className="text-2xl font-bold mb-6 text-ttt-primary">Waiting for Opponent</h2>
        
        <div className="mb-8">
          <p className="text-muted mb-2">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-white mb-4">{roomCode}</p>
        </div>
        
        <button
          onClick={onCopyLink}
          className="btn-primary w-full bg-ttt-primary text-black mb-4"
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
  gameState: TicTacToeState
  playerName: string
  onCellClick: (index: number) => void
  onPlayAgain: () => void
  onBack: () => void
  opponentDisconnected: boolean
}

function GameBoard({ gameState, playerName, onCellClick, onPlayAgain, onBack, opponentDisconnected }: GameBoardProps) {
  const { board, currentTurn, winner, winningLine, scores, players, isMultiplayer, playerMark, rematchRequested, opponentRematchRequested } = gameState
  
  const myTurn = isMultiplayer ? playerMark === currentTurn : currentTurn === 'X'
  const showRematchButton = winner && (isMultiplayer ? !rematchRequested : true)
  const bothWantRematch = rematchRequested && opponentRematchRequested
  
  useEffect(() => {
    if (bothWantRematch) {
      playWin()
    }
  }, [bothWantRematch])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <button onClick={onBack} className="text-muted hover:text-white mb-6 transition-colors">
          ← Back to Lobby
        </button>
        
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-ttt-primary">Tic-Tac-Toe</h2>
              {isMultiplayer && (
                <p className="text-sm text-muted">Playing as {playerMark}</p>
              )}
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
          
          <div className="flex justify-between mb-6 text-sm">
            <div className={`px-4 py-2 rounded-lg ${currentTurn === 'X' ? 'bg-ttt-primary/20 border border-ttt-primary' : 'bg-surface'}`}>
              <span className="text-ttt-primary font-bold">X</span> {players.X}
              <span className="ml-2 text-white font-bold">{scores.X}</span>
            </div>
            <div className="px-4 py-2 bg-surface rounded-lg">
              Draw: <span className="font-bold">{scores.draws}</span>
            </div>
            <div className={`px-4 py-2 rounded-lg ${currentTurn === 'O' ? 'bg-ttt-secondary/20 border border-ttt-secondary' : 'bg-surface'}`}>
              <span className="text-ttt-secondary font-bold">O</span> {players.O}
              <span className="ml-2 text-white font-bold">{scores.O}</span>
            </div>
          </div>
          
          {opponentDisconnected ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-xl font-bold mb-4">Opponent Disconnected</p>
              <button onClick={onBack} className="btn-primary bg-ttt-primary text-black">
                Return to Lobby
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-4 h-8">
                {winner ? (
                  <span className={`text-xl font-bold ${
                    winner === 'draw' ? 'text-yellow-500' :
                    (isMultiplayer && winner === playerMark) || (!isMultiplayer && winner === 'X') ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {winner === 'draw' ? "It's a Draw!" : `${winner === 'X' ? players.X : players.O} Wins!`}
                  </span>
                ) : (
                  <span className="text-muted">
                    {myTurn ? 'Your turn' : `${currentTurn === 'X' ? players.X : players.O}'s turn`}
                  </span>
                )}
              </div>
              
              <div className="relative aspect-square mb-6">
                <div className="grid grid-cols-3 gap-2 h-full">
                  {board.map((cell, index) => (
                    <button
                      key={index}
                      onClick={() => onCellClick(index)}
                      disabled={!!cell || !!winner || !myTurn}
                      className={`bg-surface border border-border rounded-lg text-4xl md:text-6xl font-bold transition-all duration-200
                        ${!cell && !winner && myTurn ? 'hover:bg-ttt-primary/10 hover:border-ttt-primary/50 cursor-pointer' : ''}
                        ${cell ? 'cursor-default' : ''}
                        ${cell === 'X' ? 'text-ttt-primary' : cell === 'O' ? 'text-ttt-secondary' : ''}
                      `}
                    >
                      {cell && <span className="animate-scale-in">{cell}</span>}
                    </button>
                  ))}
                </div>
                
                {winningLine && (
                  <WinningLine winningLine={winningLine} />
                )}
              </div>
              
              {rematchRequested && !bothWantRematch && (
                <p className="text-center text-muted mb-4">
                  {opponentRematchRequested ? 'Accepting rematch...' : 'Waiting for opponent...'}
                </p>
              )}
              
              {showRematchButton && (
                <button onClick={onPlayAgain} className="btn-primary w-full bg-ttt-primary text-black mb-3">
                  {isMultiplayer ? 'Request Rematch' : 'Play Again'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function WinningLine({ winningLine }: { winningLine: number[] }) {
  const positions: Record<number, { x: number; y: number }> = {
    0: { x: 0, y: 0 }, 1: { x: 1, y: 0 }, 2: { x: 2, y: 0 },
    3: { x: 0, y: 1 }, 4: { x: 1, y: 1 }, 5: { x: 2, y: 1 },
    6: { x: 0, y: 2 }, 7: { x: 1, y: 2 }, 8: { x: 2, y: 2 },
  }
  
  const start = positions[winningLine[0]]
  const end = positions[winningLine[2]]
  
  const cellSize = 100 / 3
  const startX = start.x * cellSize + cellSize / 2
  const startY = start.y * cellSize + cellSize / 2
  const endX = end.x * cellSize + cellSize / 2
  const endY = end.y * cellSize + cellSize / 2
  
  const dx = endX - startX
  const dy = endY - startY
  const length = Math.sqrt(dx * dx + dy * dy)
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-draw-line"
        style={{
          strokeDasharray: length,
          strokeDashoffset: 0,
        }}
      />
    </svg>
  )
}
