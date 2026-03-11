'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { findBestMove, getWinningLine } from '@/app/lib/minimax'
import { playSound } from '@/app/lib/sounds'
import { TicTacToeState } from '@/app/lib/types'

function TicTacToeGame() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'ai'
  const roomId = searchParams.get('roomId')
  const playerId = searchParams.get('playerId')
  const playerName = searchParams.get('name') || 'Player 1'
  
  const [board, setBoard] = useState<('X' | 'O' | null)[]>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X')
  const [winner, setWinner] = useState<'X' | 'O' | 'draw' | null>(null)
  const [winningLine, setWinningLine] = useState<number[] | null>(null)
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 })
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [opponentName, setOpponentName] = useState('AI')
  const [isMyTurn, setIsMyTurn] = useState(true)
  const [connected, setConnected] = useState(true)
  const [showRematchRequest, setShowRematchRequest] = useState(false)
  const [rematchRequested, setRematchRequested] = useState(false)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const mySymbol: 'X' = 'X'
  const opponentSymbol: 'O' = 'O'

  useEffect(() => {
    const isMulti = mode === 'multiplayer' && !!roomId
    setIsMultiplayer(isMulti)
    
    if (isMulti) {
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
          const state = message.payload.gameState as TicTacToeState
          setBoard(state.board)
          setCurrentPlayer(state.currentPlayer)
          setWinner(state.winner)
          setWinningLine(state.winningLine)
          setScores(state.scores)
          setIsMyTurn(state.currentPlayer === mySymbol)
        }
        
        if (message.type === 'rematch-request') {
          setShowRematchRequest(true)
        }
        
        if (message.type === 'rematch-accepted') {
          const state = message.payload.gameState as TicTacToeState
          setBoard(state.board)
          setCurrentPlayer(state.currentPlayer)
          setWinner(state.winner)
          setWinningLine(state.winningLine)
          setScores(state.scores)
          setRematchRequested(false)
          setShowRematchRequest(false)
        }
      }
      
      eventSource.onerror = () => {
        setConnected(false)
      }
      
      return () => {
        eventSource.close()
      }
    }
  }, [mode, roomId, playerId, mySymbol])

  const checkGameEnd = useCallback((newBoard: ('X' | 'O' | null)[], nextPlayer: 'X' | 'O') => {
    const winLine = getWinningLine(newBoard)
    
    if (winLine) {
      setWinningLine(winLine)
      const winPlayer = newBoard[winLine[0]] as 'X' | 'O'
      setWinner(winPlayer)
      setScores(prev => ({
        ...prev,
        [winPlayer]: prev[winPlayer] + 1
      }))
      playSound('win')
      return true
    }
    
    if (newBoard.every(cell => cell !== null)) {
      setWinner('draw')
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }))
      playSound('draw')
      return true
    }
    
    setCurrentPlayer(nextPlayer)
    return false
  }, [])

  const makeMove = useCallback((index: number) => {
    if (board[index] || winner || (!isMultiplayer && currentPlayer !== 'X') || (isMultiplayer && !isMyTurn)) return
    
    const newBoard = [...board]
    newBoard[index] = currentPlayer
    setBoard(newBoard)
    playSound('move')
    
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X'
    const gameEnded = checkGameEnd(newBoard, nextPlayer)
    
    if (!gameEnded && isMultiplayer) {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'update',
          gameState: {
            board: newBoard,
            currentPlayer: nextPlayer,
            winner: null,
            winningLine: null,
            scores,
          },
        }),
      })
    }
  }, [board, currentPlayer, winner, isMultiplayer, isMyTurn, checkGameEnd, roomId, scores])

  useEffect(() => {
    if (isMultiplayer || mode !== 'ai' || winner || currentPlayer !== 'O') return
    
    const timer = setTimeout(() => {
      const bestMove = findBestMove(board)
      if (bestMove !== -1) {
        makeMove(bestMove)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [currentPlayer, isMultiplayer, mode, winner, board, makeMove])

  const playAgain = () => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
    setWinner(null)
    setWinningLine(null)
    setRematchRequested(false)
    setShowRematchRequest(false)
    
    if (isMultiplayer && roomId) {
      fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          action: 'rematch',
          playerId,
          gameState: {
            board: Array(9).fill(null),
            currentPlayer: 'X',
            winner: null,
            winningLine: null,
            scores,
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
            board: Array(9).fill(null),
            currentPlayer: 'X',
            winner: null,
            winningLine: null,
            scores,
          },
        }),
      })
      setRematchRequested(true)
    }
    setShowRematchRequest(false)
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
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
          <div className="flex justify-between items-center mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">{playerName}</div>
              <div className="text-3xl font-bold text-ttt-green">{scores.X}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">Draws</div>
              <div className="text-2xl font-bold text-gray-500">{scores.draws}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">{opponentName}</div>
              <div className="text-3xl font-bold text-purple-500">{scores.O}</div>
            </div>
          </div>

          {!winner && (
            <div className="text-center mb-6">
              <span className={`text-lg ${isMyTurn || (!isMultiplayer && currentPlayer === 'X') ? 'text-ttt-green' : 'text-gray-400'}`}>
                {isMultiplayer ? (isMyTurn ? "Your turn (X)" : "Opponent's turn") : (currentPlayer === 'X' ? "Your turn" : "AI thinking...")}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => makeMove(index)}
                disabled={!!cell || !!winner || (!isMultiplayer && currentPlayer !== 'X') || (isMultiplayer && !isMyTurn)}
                className={`aspect-square rounded-xl text-6xl font-bold transition-all duration-300 ${
                  cell
                    ? 'bg-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700'
                } ${
                  winningLine?.includes(index)
                    ? 'ring-4 ring-ttt-green ring-offset-4 ring-offset-slate-800'
                    : ''
                } ${
                  !cell && !winner && ((isMultiplayer && isMyTurn) || (!isMultiplayer && currentPlayer === 'X'))
                    ? 'cursor-pointer hover:scale-105'
                    : ''
                }`}
              >
                <span className={`inline-block transition-all duration-300 ${cell ? 'animate-fade-in' : ''}`}>
                  {cell === 'X' && <span className="text-ttt-green">X</span>}
                  {cell === 'O' && <span className="text-purple-500">O</span>}
                </span>
              </button>
            ))}
          </div>

          {winner && (
            <div className="mt-8 text-center animate-fade-in">
              <div className={`text-3xl font-bold mb-6 ${
                winner === 'X' ? 'text-ttt-green' :
                winner === 'O' ? 'text-purple-500' : 'text-gray-400'
              }`}>
                {winner === 'X' ? `${playerName} Wins!` :
                 winner === 'O' ? `${opponentName} Wins!` : "It's a Draw!"}
              </div>
              <button
                onClick={playAgain}
                className="px-8 py-4 bg-gradient-to-r from-ttt-green to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-white font-semibold transition-all"
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-ttt-green to-emerald-600 rounded-xl text-white font-semibold"
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

export default function TicTacToePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <TicTacToeGame />
    </Suspense>
  )
}
