'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TTTPlayer } from '@/types';
import { playMoveSound, playWinSound, playLoseSound, playDrawSound } from '@/lib/audio';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function TicTacToeAIContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const playerName = decodeURIComponent(searchParams.get('name') || 'Player');
  
  const [board, setBoard] = useState<(TTTPlayer | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<TTTPlayer>('X');
  const [winner, setWinner] = useState<TTTPlayer | 'draw' | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [gameOver, setGameOver] = useState(false);

  const checkWinner = useCallback((b: (TTTPlayer | null)[]): { winner: TTTPlayer | null; line: number[] | null } => {
    for (const line of WINNING_LINES) {
      const [a, b_idx, c] = line;
      if (b[a] && b[a] === b[b_idx] && b[a] === b[c]) {
        return { winner: b[a], line };
      }
    }
    return { winner: null, line: null };
  }, []);

  const isBoardFull = (b: (TTTPlayer | null)[]): boolean => {
    return b.every(cell => cell !== null);
  };

  const getBestMove = useCallback((b: (TTTPlayer | null)[], player: TTTPlayer): number => {
    const available = b.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
    if (available.length === 0) return -1;
    
    const opponent: TTTPlayer = player === 'X' ? 'O' : 'X';
    
    const minimax = (bd: (TTTPlayer | null)[], p: TTTPlayer, depth: number): number => {
      const { winner } = checkWinner(bd);
      if (winner === player) return 10 - depth;
      if (winner === opponent) return depth - 10;
      if (isBoardFull(bd)) return 0;
      
      const moves = bd.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
      const moveScores: number[] = [];
      
      for (const move of moves) {
        const newBoard = [...bd];
        newBoard[move] = p;
        moveScores.push(minimax(newBoard, p === player ? opponent : player, depth + 1));
      }
      
      return p === player ? Math.max(...moveScores) : Math.min(...moveScores);
    };
    
    let bestScore = -Infinity;
    let bestMove = available[0];
    
    for (const move of available) {
      const newBoard = [...b];
      newBoard[move] = player;
      const score = minimax(newBoard, opponent, 0);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    return bestMove;
  }, [checkWinner]);

  useEffect(() => {
    if (turn === 'O' && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove(board, 'O');
        if (aiMove !== -1) {
          const newBoard = [...board];
          newBoard[aiMove] = 'O';
          setBoard(newBoard);
          playMoveSound();
          
          const result = checkWinner(newBoard);
          if (result.winner) {
            setWinner(result.winner);
            setWinningLine(result.line);
            setGameOver(true);
            if (result.winner === 'O') {
              playLoseSound();
              setScores(s => ({ ...s, ai: s.ai + 1 }));
            } else {
              playWinSound();
              setScores(s => ({ ...s, player: s.player + 1 }));
            }
          } else if (isBoardFull(newBoard)) {
            setWinner('draw');
            setGameOver(true);
            playDrawSound();
            setScores(s => ({ ...s, draws: s.draws + 1 }));
          } else {
            setTurn('X');
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turn, winner, board, getBestMove, checkWinner]);

  const makeMove = (index: number) => {
    if (board[index] !== null || turn !== 'X' || winner) return;
    
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    playMoveSound();
    
    const result = checkWinner(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningLine(result.line);
      setGameOver(true);
      if (result.winner === 'X') {
        playWinSound();
        setScores(s => ({ ...s, player: s.player + 1 }));
      } else {
        playLoseSound();
        setScores(s => ({ ...s, ai: s.ai + 1 }));
      }
    } else if (isBoardFull(newBoard)) {
      setWinner('draw');
      setGameOver(true);
      playDrawSound();
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    } else {
      setTurn('O');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setTurn('X');
    setWinner(null);
    setWinningLine(null);
    setGameOver(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-green-400">Tic-Tac-Toe vs AI</h1>
          <div></div>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-400">
            <span className="text-green-400">{playerName}</span> (X) vs <span className="text-purple-400">AI</span> (O)
          </p>
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">{playerName}</p>
            <p className="text-2xl font-bold text-green-400">X</p>
            <p className="text-xl">{scores.player}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">Draws</p>
            <p className="text-2xl font-bold text-gray-400">-</p>
            <p className="text-xl">{scores.draws}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">AI</p>
            <p className="text-2xl font-bold text-purple-400">O</p>
            <p className="text-xl">{scores.ai}</p>
          </div>
        </div>

        {!gameOver && (
          <div className="text-center mb-4">
            <p className="text-lg">
              {turn === 'X' ? (
                <span className="text-green-400">Your turn</span>
              ) : (
                <span className="text-purple-400">AI is thinking...</span>
              )}
            </p>
          </div>
        )}

        <div className="relative bg-gray-800/50 p-4 rounded-2xl mb-8">
          <div className="grid grid-cols-3 gap-2">
            {board.map((cell, i) => (
              <button
                key={i}
                onClick={() => makeMove(i)}
                disabled={cell !== null || turn !== 'X' || winner !== null}
                className={`
                  w-20 h-20 sm:w-24 sm:h-24 rounded-xl text-4xl sm:text-5xl font-bold flex items-center justify-center
                  transition-all duration-200
                  ${cell === null ? 'bg-white/5 hover:bg-white/10' : 'bg-white/10'}
                  ${cell === null && turn === 'X' && !winner ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  ${cell === 'X' ? 'text-green-400' : 'text-purple-400'}
                `}
              >
                {cell && (
                  <span className="animate-fade-in">{cell}</span>
                )}
              </button>
            ))}
          </div>
          
          {winningLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ padding: '1rem' }}>
              {(() => {
                const indices = [0, 1, 2].map(i => {
                  const row = Math.floor(winningLine[i] / 3);
                  const col = winningLine[i] % 3;
                  return {
                    x: col * 33.33 + 16.67,
                    y: row * 33.33 + 16.67,
                  };
                });
                
                return (
                  <line
                    x1={indices[0].x + '%'}
                    y1={indices[0].y + '%'}
                    x2={indices[2].x + '%'}
                    y2={indices[2].y + '%'}
                    stroke="rgb(34, 197, 94)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="win-line"
                  />
                );
              })()}
            </svg>
          )}
        </div>

        {winner && (
          <div className="text-center animate-scale-in">
            <p className={`text-3xl font-bold mb-4 ${
              winner === 'draw' ? 'text-yellow-400' : 
              winner === 'X' ? 'text-green-400' : 'text-red-400'
            }`}>
              {winner === 'draw' ? "It's a Draw!" : 
               winner === 'X' ? 'You Win!' : 'You Lose!'}
            </p>
            <button onClick={resetGame} className="btn-primary btn-ttt">
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TicTacToeAI() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse">Loading...</div>
      </div>
    }>
      <TicTacToeAIContent />
    </Suspense>
  );
}
