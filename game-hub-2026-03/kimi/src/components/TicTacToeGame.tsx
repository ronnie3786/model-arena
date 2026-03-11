'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, TicTacToeState, Room } from '@/types';
import { getBestMove, checkWinner } from '@/lib/tictactoe-ai';
import { soundManager } from '@/lib/sound';

interface TicTacToeGameProps {
  mode: 'ai' | 'multiplayer';
  room?: Room;
  playerId?: string;
  playerName: string;
  onGameUpdate?: (gameState: TicTacToeState) => void;
  onPlayAgain?: () => void;
  opponentDisconnected?: boolean;
}

export default function TicTacToeGame({
  mode,
  room,
  playerId,
  onGameUpdate,
  onPlayAgain,
  opponentDisconnected,
}: TicTacToeGameProps) {
  const [gameState, setGameState] = useState<TicTacToeState>({
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    winningLine: null,
    scores: { X: 0, O: 0, draws: 0 },
  });

  const [animatingCells, setAnimatingCells] = useState<number[]>([]);
  const [showWinLine, setShowWinLine] = useState(false);

  const isMyTurn = useCallback(() => {
    if (mode === 'ai') return true;
    if (!room || !playerId) return false;
    const me = room.players.find(p => p.id === playerId);
    return me?.symbol === gameState.currentPlayer;
  }, [mode, room, playerId, gameState.currentPlayer]);

  const handleMove = useCallback((index: number) => {
    if (gameState.board[index] || gameState.winner || !isMyTurn()) return;

    soundManager.playMove();

    const newBoard = [...gameState.board];
    newBoard[index] = gameState.currentPlayer;

    setAnimatingCells([index]);
    setTimeout(() => setAnimatingCells([]), 300);

    const result = checkWinner(newBoard);

    if (result.winner) {
      soundManager.playWin();
      setShowWinLine(true);
    }

    const newGameState: TicTacToeState = {
      ...gameState,
      board: newBoard,
      currentPlayer: gameState.currentPlayer === 'X' ? 'O' : 'X',
      winner: result.winner,
      winningLine: result.line,
      scores: result.winner === 'draw'
        ? { ...gameState.scores, draws: gameState.scores.draws + 1 }
        : result.winner
        ? { ...gameState.scores, [result.winner]: gameState.scores[result.winner as Player] + 1 }
        : gameState.scores,
    };

    setGameState(newGameState);

    if (mode === 'multiplayer' && onGameUpdate) {
      onGameUpdate(newGameState);
    }
  }, [gameState, isMyTurn, mode, onGameUpdate]);

  useEffect(() => {
    if (mode === 'ai' && gameState.currentPlayer === 'O' && !gameState.winner) {
      const timeout = setTimeout(() => {
        const bestMove = getBestMove([...gameState.board], 'O');
        if (bestMove !== -1) {
          handleMove(bestMove);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [gameState, mode, handleMove]);

  useEffect(() => {
    if (room?.gameState && mode === 'multiplayer') {
      setGameState(room.gameState as TicTacToeState);
      if ((room.gameState as TicTacToeState).winningLine) {
        setShowWinLine(true);
      }
    }
  }, [room, mode]);

  const resetGame = () => {
    soundManager.playClick();
    setShowWinLine(false);
    setGameState(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null,
    }));
    if (mode === 'multiplayer' && onPlayAgain) {
      onPlayAgain();
    }
  };

  const getWinLineStyle = () => {
    if (!gameState.winningLine) return {};
    const [a, , c] = gameState.winningLine;
    const isHorizontal = Math.floor(a / 3) === Math.floor(c / 3);
    const isVertical = a % 3 === c % 3;
    const isDiagonal = (a === 0 && c === 8) || (a === 2 && c === 6);

    if (isHorizontal) {
      const row = Math.floor(a / 3);
      return {
        top: `${row * 33.33 + 16.67}%`,
        left: '5%',
        width: '90%',
        height: '4px',
      };
    } else if (isVertical) {
      const col = a % 3;
      return {
        left: `${col * 33.33 + 16.67}%`,
        top: '5%',
        width: '4px',
        height: '90%',
      };
    } else if (isDiagonal) {
      const angle = a === 0 ? 45 : -45;
      return {
        top: '50%',
        left: '5%',
        width: '127%',
        height: '4px',
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'left center',
      };
    }
    return {};
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {mode === 'multiplayer' && room && (
        <div className="flex items-center justify-between w-full px-4">
          <div className="text-center">
            <p className="text-emerald-400 font-semibold">{room.players[0]?.name}</p>
            <p className="text-xs text-gray-400">X</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {opponentDisconnected ? (
                <span className="text-red-400">Opponent disconnected</span>
              ) : isMyTurn() ? (
                <span className="text-emerald-400">Your turn</span>
              ) : (
                <span className="text-gray-300">Opponent&apos;s turn</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-emerald-400 font-semibold">{room.players[1]?.name || 'Waiting...'}</p>
            <p className="text-xs text-gray-400">O</p>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="text-center">
          <p className="text-gray-300">
            {gameState.winner ? (
              gameState.winner === 'draw' ? (
                <span className="text-yellow-400">Draw!</span>
              ) : (
                <span className={gameState.winner === 'X' ? 'text-emerald-400' : 'text-red-400'}>
                  {gameState.winner === 'X' ? 'You Win!' : 'You Lose!'}
                </span>
              )
            ) : (
              <span className={gameState.currentPlayer === 'X' ? 'text-emerald-400' : 'text-gray-400'}>
                {gameState.currentPlayer === 'X' ? 'Your turn (X)' : 'AI thinking...'}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="relative">
        <div className="grid grid-cols-3 gap-2 bg-gray-800 p-2 rounded-lg">
          {gameState.board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleMove(index)}
              disabled={!!cell || !!gameState.winner || !isMyTurn()}
              className={`
                w-20 h-20 sm:w-24 sm:h-24 
                bg-gray-900 rounded-md 
                flex items-center justify-center 
                text-4xl sm:text-5xl font-bold
                transition-all duration-300
                ${!cell && isMyTurn() && !gameState.winner ? 'hover:bg-gray-700 cursor-pointer' : 'cursor-default'}
                ${animatingCells.includes(index) ? 'scale-110' : 'scale-100'}
              `}
            >
              {cell && (
                <span
                  className={`
                    ${cell === 'X' ? 'text-emerald-400' : 'text-purple-400'}
                    animate-fade-in
                  `}
                  style={{
                    animation: animatingCells.includes(index) ? 'fadeIn 0.3s ease-out' : undefined,
                  }}
                >
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>

        {showWinLine && gameState.winningLine && (
          <div
            className="absolute bg-emerald-400 rounded-full transition-all duration-500"
            style={{
              ...getWinLineStyle(),
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)',
            }}
          />
        )}
      </div>

      <div className="flex gap-8 text-center">
        <div>
          <p className="text-emerald-400 font-bold text-xl">{gameState.scores.X}</p>
          <p className="text-xs text-gray-400">{mode === 'ai' ? 'You (X)' : 'X'}</p>
        </div>
        <div>
          <p className="text-gray-400 font-bold text-xl">{gameState.scores.draws}</p>
          <p className="text-xs text-gray-400">Draws</p>
        </div>
        <div>
          <p className="text-purple-400 font-bold text-xl">{gameState.scores.O}</p>
          <p className="text-xs text-gray-400">{mode === 'ai' ? 'AI (O)' : 'O'}</p>
        </div>
      </div>

      {gameState.winner && (
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors"
        >
          Play Again
        </button>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
