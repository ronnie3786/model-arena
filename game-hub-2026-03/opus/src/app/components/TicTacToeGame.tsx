'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RoomInfo } from '@/app/lib/types';
import { playMoveSound, playWinSound, playLoseSound, playDrawSound, playClickSound } from '@/app/lib/sounds';

interface Props {
  room: RoomInfo;
  playerId: string;
  playerNumber: 1 | 2;
  playerName: string;
  onGoHome: () => void;
}

export default function TicTacToeGame({ room, playerId, playerNumber, playerName, onGoHome }: Props) {
  const [animatedCells, setAnimatedCells] = useState<Set<number>>(new Set());
  const lastPlayedSoundRef = useRef<string | null>(null);

  const state = room.tttState;
  const myMark = playerNumber === 1 ? 'X' : 'O';
  const isMyTurn = state ? state.currentTurn === myMark && !state.winner : false;
  const opponentName = playerNumber === 1 ? room.player2?.name || 'Player 2' : room.player1?.name || 'Player 1';
  const opponentConnected = playerNumber === 1 ? room.player2?.connected : room.player1?.connected;

  // Play sounds on game state change
  useEffect(() => {
    if (state?.winner && state.winner !== lastPlayedSoundRef.current) {
      lastPlayedSoundRef.current = state.winner;
      if (state.winner === myMark) {
        playWinSound();
      } else if (state.winner === 'draw') {
        playDrawSound();
      } else {
        playLoseSound();
      }
    }
    if (!state?.winner) {
      lastPlayedSoundRef.current = null;
    }
  }, [state?.winner, myMark]);

  const handleCellClick = useCallback(async (index: number) => {
    if (!state || !isMyTurn || state.board[index] !== null || state.winner) return;

    playMoveSound();
    setAnimatedCells(prev => new Set([...prev, index]));

    await fetch(`/api/rooms/${room.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        action: 'ttt_move',
        cellIndex: index,
      }),
    });
  }, [state, isMyTurn, room.id, playerId]);

  const handlePlayAgain = useCallback(async () => {
    playClickSound();
    setAnimatedCells(new Set());
    await fetch(`/api/rooms/${room.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, action: 'ttt_play_again' }),
    });
  }, [room.id, playerId]);

  // Calculate win line positions for SVG overlay
  const getWinLineCoords = useCallback((line: number[]) => {
    const positions = [
      [1, 1], [3, 1], [5, 1],
      [1, 3], [3, 3], [5, 3],
      [1, 5], [3, 5], [5, 5],
    ];
    const [start, , end] = line;
    return {
      x1: positions[start][0],
      y1: positions[start][1],
      x2: positions[end][0],
      y2: positions[end][1],
    };
  }, []);

  if (!state) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 page-enter">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onGoHome} className="text-gray-400 hover:text-white transition-colors text-sm">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-green-400">Tic-Tac-Toe</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${opponentConnected !== false ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {opponentConnected !== false ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Players */}
        <div className="flex justify-between items-center bg-gray-900/60 rounded-xl p-3 mb-4">
          <div className={`flex items-center gap-2 ${state.currentTurn === 'X' && !state.winner ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-green-400 font-bold text-lg">X</span>
            <span className="text-sm">{playerNumber === 1 ? playerName : opponentName}</span>
            {state.currentTurn === 'X' && !state.winner && (
              <span className="text-xs text-green-400 animate-pulse-slow">&larr;</span>
            )}
          </div>
          <div className={`flex items-center gap-2 ${state.currentTurn === 'O' && !state.winner ? 'opacity-100' : 'opacity-50'}`}>
            {state.currentTurn === 'O' && !state.winner && (
              <span className="text-xs text-green-300 animate-pulse-slow">&rarr;</span>
            )}
            <span className="text-sm">{playerNumber === 2 ? playerName : opponentName}</span>
            <span className="text-green-300 font-bold text-lg">O</span>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="text-center mb-4">
          {state.winner ? (
            <p className={`text-lg font-bold animate-bounce-in ${
              state.winner === 'draw' ? 'text-yellow-400' :
              state.winner === myMark ? 'text-green-400' : 'text-red-400'
            }`}>
              {state.winner === 'draw' ? "It's a Draw!" :
               state.winner === myMark ? 'You Win!' : 'You Lose!'}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              {isMyTurn ? (
                <span className="text-green-400 font-semibold">Your turn</span>
              ) : (
                <span>Waiting for {opponentName}...</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full max-w-[320px] aspect-square mb-6">
        <div className="grid grid-cols-3 gap-2 w-full h-full">
          {state.board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={!isMyTurn || cell !== null || !!state.winner}
              className={`
                relative bg-gray-800/80 rounded-xl flex items-center justify-center text-4xl sm:text-5xl font-bold
                transition-all duration-200
                ${!cell && isMyTurn && !state.winner ? 'hover:bg-gray-700/80 cursor-pointer hover:scale-[1.02]' : ''}
                ${cell ? '' : 'cursor-default'}
                ${state.winningLine?.includes(i) ? 'bg-green-900/40' : ''}
              `}
            >
              {cell && (
                <span className={`
                  ${cell === 'X' ? 'text-green-400' : 'text-green-200'}
                  ${animatedCells.has(i) || cell ? 'animate-fade-in' : ''}
                `}>
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Win line SVG overlay */}
        {state.winningLine && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 6 6"
            preserveAspectRatio="none"
          >
            {(() => {
              const coords = getWinLineCoords(state.winningLine);
              return (
                <line
                  x1={coords.x1}
                  y1={coords.y1}
                  x2={coords.x2}
                  y2={coords.y2}
                  stroke="#22c55e"
                  strokeWidth="0.15"
                  strokeLinecap="round"
                  className="animate-win-line"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.6))' }}
                />
              );
            })()}
          </svg>
        )}
      </div>

      {/* Scores */}
      <div className="flex gap-6 mb-6 bg-gray-900/60 rounded-xl px-6 py-3">
        <div className="text-center">
          <p className="text-xs text-gray-400">{playerNumber === 1 ? 'You' : opponentName}</p>
          <p className="text-xl font-bold text-green-400">{state.scores.player1}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Draws</p>
          <p className="text-xl font-bold text-yellow-400">{state.scores.draws}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">{playerNumber === 2 ? 'You' : opponentName}</p>
          <p className="text-xl font-bold text-green-300">{state.scores.player2}</p>
        </div>
      </div>

      {/* Actions */}
      {state.winner && (
        <div className="flex gap-3 animate-fade-in-up">
          {room.rematchRequests.includes(playerId) ? (
            <button disabled className="px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-semibold cursor-not-allowed">
              Waiting for opponent...
            </button>
          ) : (
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
            >
              Play Again
            </button>
          )}
          <button
            onClick={onGoHome}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      )}
    </div>
  );
}
