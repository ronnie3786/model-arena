'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TTTBoard, TTTCell } from '@/app/lib/types';
import { getBestMove } from '@/app/lib/tttAI';
import { playMoveSound, playWinSound, playLoseSound, playDrawSound, playClickSound } from '@/app/lib/sounds';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWin(board: TTTBoard): { winner: TTTCell; line: number[] } | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

function TicTacToeAIInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get('name') || 'Player';

  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<TTTCell | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [animatedCells, setAnimatedCells] = useState<Set<number>>(new Set());
  const [soundPlayed, setSoundPlayed] = useState(false);

  // AI move
  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const boardCopy = [...board] as TTTBoard;
        const move = getBestMove(boardCopy as ('X' | 'O' | null)[]);
        if (move >= 0) {
          const newBoard = [...board] as TTTBoard;
          newBoard[move] = 'O';
          setBoard(newBoard);
          setAnimatedCells(prev => new Set([...prev, move]));
          playMoveSound();

          const result = checkWin(newBoard);
          if (result) {
            setWinner(result.winner);
            setWinningLine(result.line);
          } else if (newBoard.every(c => c !== null)) {
            setWinner('draw');
          } else {
            setIsPlayerTurn(true);
          }
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, winner, board]);

  // Sound and score on win
  useEffect(() => {
    if (winner && !soundPlayed) {
      setSoundPlayed(true);
      // Update scores immediately on win
      if (winner === 'X') {
        playWinSound();
        setScores(s => ({ ...s, player: s.player + 1 }));
      } else if (winner === 'O') {
        playLoseSound();
        setScores(s => ({ ...s, ai: s.ai + 1 }));
      } else {
        playDrawSound();
        setScores(s => ({ ...s, draws: s.draws + 1 }));
      }
    }
  }, [winner, soundPlayed]);

  const handleCellClick = useCallback((index: number) => {
    if (!isPlayerTurn || board[index] !== null || winner) return;

    playMoveSound();
    const newBoard = [...board] as TTTBoard;
    newBoard[index] = 'X';
    setBoard(newBoard);
    setAnimatedCells(prev => new Set([...prev, index]));

    const result = checkWin(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
    } else if (newBoard.every(c => c !== null)) {
      setWinner('draw');
    } else {
      setIsPlayerTurn(false);
    }
  }, [isPlayerTurn, board, winner]);

  const handlePlayAgain = useCallback(() => {
    playClickSound();
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinner(null);
    setWinningLine(null);
    setAnimatedCells(new Set());
    setSoundPlayed(false);
  }, []);

  const getWinLineCoords = (line: number[]) => {
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
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 page-enter">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { playClickSound(); router.push('/'); }} className="text-gray-400 hover:text-white transition-colors text-sm">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-green-400">Tic-Tac-Toe vs AI</h1>
          <div className="w-16" />
        </div>

        {/* Players */}
        <div className="flex justify-between items-center bg-gray-900/60 rounded-xl p-3 mb-4">
          <div className={`flex items-center gap-2 ${isPlayerTurn && !winner ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-green-400 font-bold text-lg">X</span>
            <span className="text-sm">{playerName}</span>
            {isPlayerTurn && !winner && (
              <span className="text-xs text-green-400 animate-pulse-slow">&larr;</span>
            )}
          </div>
          <div className={`flex items-center gap-2 ${!isPlayerTurn && !winner ? 'opacity-100' : 'opacity-50'}`}>
            {!isPlayerTurn && !winner && (
              <span className="text-xs text-green-300 animate-pulse-slow">&rarr;</span>
            )}
            <span className="text-sm">AI</span>
            <span className="text-green-300 font-bold text-lg">O</span>
          </div>
        </div>

        {/* Turn indicator */}
        <div className="text-center mb-4">
          {winner ? (
            <p className={`text-lg font-bold animate-bounce-in ${
              winner === 'draw' ? 'text-yellow-400' :
              winner === 'X' ? 'text-green-400' : 'text-red-400'
            }`}>
              {winner === 'draw' ? "It's a Draw!" :
               winner === 'X' ? 'You Win!' : 'AI Wins!'}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              {isPlayerTurn ? (
                <span className="text-green-400 font-semibold">Your turn</span>
              ) : (
                <span className="animate-pulse-slow">AI is thinking...</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="relative w-full max-w-[320px] aspect-square mb-6">
        <div className="grid grid-cols-3 gap-2 w-full h-full">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={!isPlayerTurn || cell !== null || !!winner}
              className={`
                relative bg-gray-800/80 rounded-xl flex items-center justify-center text-4xl sm:text-5xl font-bold
                transition-all duration-200
                ${!cell && isPlayerTurn && !winner ? 'hover:bg-gray-700/80 cursor-pointer hover:scale-[1.02]' : ''}
                ${winningLine?.includes(i) ? 'bg-green-900/40' : ''}
              `}
            >
              {cell && (
                <span className={`
                  ${cell === 'X' ? 'text-green-400' : 'text-green-200'}
                  ${animatedCells.has(i) ? 'animate-fade-in' : ''}
                `}>
                  {cell}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Win line SVG overlay */}
        {winningLine && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 6 6"
            preserveAspectRatio="none"
          >
            {(() => {
              const coords = getWinLineCoords(winningLine);
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
          <p className="text-xs text-gray-400">{playerName}</p>
          <p className="text-xl font-bold text-green-400">{scores.player}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Draws</p>
          <p className="text-xl font-bold text-yellow-400">{scores.draws}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">AI</p>
          <p className="text-xl font-bold text-green-300">{scores.ai}</p>
        </div>
      </div>

      {/* Actions */}
      {winner && (
        <div className="flex gap-3 animate-fade-in-up">
          <button
            onClick={handlePlayAgain}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold transition-colors"
          >
            Play Again
          </button>
          <button
            onClick={() => { playClickSound(); router.push('/'); }}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      )}
    </div>
  );
}

export default function TicTacToeAI() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <TicTacToeAIInner />
    </Suspense>
  );
}
