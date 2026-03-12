'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSound } from '@/lib/useSound';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { WaitingRoom } from '@/components/WaitingRoom';

function checkWinnerLocal(board: any[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: lines[i] };
    }
  }
  return null;
}

function minimax(board: any[], depth: number, isMaximizing: boolean): number {
  const result = checkWinnerLocal(board);
  if (result) return result.winner === 'O' ? 10 - depth : depth - 10;
  if (board.every(cell => cell !== null)) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        let score = minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        let score = minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

function getBestMove(board: any[]): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O';
      let score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

import { Suspense } from 'react';

export default function TicTacToe() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white">Loading...</div>}>
      <TicTacToeContent />
    </Suspense>
  );
}

function TicTacToeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'ai';
  const roomId = searchParams.get('roomId');
  
  const { playMove, playWin, playLose, playDraw } = useSound();
  // If roomId is in the URL, it's a multiplayer session regardless of mode param
  const { room, connected, playerId, performAction } = useMultiplayer(roomId, !roomId);

  // AI State
  const [localBoard, setLocalBoard] = useState(Array(9).fill(null));
  const [localTurn, setLocalTurn] = useState('X');
  const [localWinner, setLocalWinner] = useState<string | null>(null);
  const [localWinningLine, setLocalWinningLine] = useState<number[] | null>(null);
  const [localDraw, setLocalDraw] = useState(false);
  const [localScores, setLocalScores] = useState({ X: 0, O: 0, draws: 0 });

  const isAI = !roomId; // roomId in URL means multiplayer session
  
  // Resolve state values
  const board = isAI ? localBoard : room?.state?.board || Array(9).fill(null);
  const turn = isAI ? localTurn : room?.state?.turn || 'X';
  const winner = isAI ? localWinner : room?.state?.winner || null;
  const winningLine = isAI ? localWinningLine : room?.state?.winningLine || null;
  const draw = isAI ? localDraw : room?.state?.draw || false;
  
  const myMark = isAI ? 'X' : (room?.state?.playersAssigned?.X === playerId ? 'X' : 'O');
  const opponentMark = myMark === 'X' ? 'O' : 'X';
  const isMyTurn = isAI ? turn === 'X' : turn === myMark;
  
  const opponentConnected = isAI ? true : (room ? (Object.values(room.players) as any[]).find((p: any) => p.id !== playerId)?.connected : false);
  const bothConnected = isAI ? true : (room && Object.keys(room.players).length === 2);

  // Sound effects trigger for multiplayer
  useEffect(() => {
    if (!isAI && room?.state) {
       // Ideally we track previous state to only play sound on change, but this is a simplified version
       // We can just rely on the user action to play sound, or if opponent moves we don't have a reliable trigger here without a prev state hook.
    }
  }, [room, isAI]);

  const handleMoveLocal = useCallback((index: number) => {
    if (localBoard[index] || localWinner || localDraw) return;
    playMove();
    
    const newBoard = [...localBoard];
    newBoard[index] = localTurn;
    setLocalBoard(newBoard);

    const winResult = checkWinnerLocal(newBoard);
    if (winResult) {
      setLocalWinner(winResult.winner);
      setLocalWinningLine(winResult.line);
      setLocalScores(prev => ({ ...prev, [winResult.winner]: prev[winResult.winner as keyof typeof prev] + 1 }));
      if (winResult.winner === 'X') playWin();
      else playLose();
    } else if (newBoard.every(cell => cell !== null)) {
      setLocalDraw(true);
      setLocalScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      playDraw();
    } else {
      setLocalTurn(localTurn === 'X' ? 'O' : 'X');
    }
  }, [localBoard, localWinner, localDraw, localTurn, playMove, playWin, playLose, playDraw]);

  // AI Move logic
  useEffect(() => {
    if (isAI && localTurn === 'O' && !localWinner && !localDraw) {
      const timer = setTimeout(() => {
        const move = getBestMove(localBoard);
        if (move !== -1) handleMoveLocal(move);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localTurn, isAI, localWinner, localDraw, localBoard, handleMoveLocal]);

  const handleMoveOnline = (index: number) => {
    if (!isMyTurn || board[index] || winner || draw) return;
    playMove();
    performAction('MOVE', { index });
  };

  const handleMove = isAI ? handleMoveLocal : handleMoveOnline;

  const resetGameLocal = () => {
    setLocalBoard(Array(9).fill(null));
    setLocalTurn('X');
    setLocalWinner(null);
    setLocalWinningLine(null);
    setLocalDraw(false);
  };

  const handleRematch = () => {
    if (isAI) resetGameLocal();
    else performAction('REMATCH');
  };

  if (!isAI && (!room || !bothConnected)) {
    return <WaitingRoom roomId={roomId || ''} room={room} connected={connected} />;
  }

  // Calculate scores
  let scores = { X: 0, O: 0, draws: 0 };
  if (isAI) {
    scores = localScores;
  } else if (room) {
    const pX = room.state.playersAssigned.X;
    const pO = room.state.playersAssigned.O;
    scores = {
      X: room.players[pX]?.score || 0,
      O: room.players[pO]?.score || 0,
      draws: room.state.drawCount || 0
    };
  }

  const myScore = myMark === 'X' ? scores.X : scores.O;
  const opponentScore = myMark === 'X' ? scores.O : scores.X;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white font-sans transition-all">
      {/* Top Bar for Multiplayer */}
      {!isAI && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">You: {room?.players[playerId || '']?.name || 'Player'} ({myMark})</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
            Exit Game
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              Opponent: {(Object.values(room?.players || {}) as any[]).find((p: any) => p.id !== playerId)?.name || '...'} ({opponentMark})
            </span>
            <span className={`w-3 h-3 rounded-full ${opponentConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg mb-8 flex justify-between items-center bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl mt-12">
        <div className="text-center flex flex-col items-center">
          <p className="text-sm text-gray-400 font-semibold mb-1 uppercase tracking-wider">Player ({myMark})</p>
          <p className="text-4xl font-bold text-green-400">{myScore}</p>
        </div>
        <div className="text-center flex flex-col items-center border-l border-r border-gray-800 px-8">
          <p className="text-sm text-gray-400 font-semibold mb-1 uppercase tracking-wider">Draws</p>
          <p className="text-4xl font-bold text-gray-300">{scores.draws}</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="text-sm text-gray-400 font-semibold mb-1 uppercase tracking-wider">{isAI ? 'AI' : 'Opponent'} ({opponentMark})</p>
          <p className="text-4xl font-bold text-blue-400">{opponentScore}</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col items-center h-12 justify-center">
        {!winner && !draw ? (
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full animate-pulse ${isMyTurn ? 'bg-green-500' : 'bg-blue-500'}`}></span>
            {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
          </h2>
        ) : (
          <h2 className={`text-4xl font-extrabold tracking-tight ${winner === myMark ? 'text-green-500' : winner ? 'text-red-500' : 'text-yellow-500'}`}>
            {winner === myMark ? 'You Win!' : winner ? 'You Lose!' : 'Draw!'}
          </h2>
        )}
      </div>

      <div className="relative bg-gray-900 p-4 sm:p-6 rounded-3xl shadow-2xl border border-gray-800 shadow-green-900/10">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 relative z-10">
          {board.map((cell: string | null, index: number) => (
            <button
              key={index}
              onClick={() => handleMove(index)}
              disabled={!!cell || !!winner || !!draw || !isMyTurn}
              className={`w-24 h-24 sm:w-32 sm:h-32 bg-gray-800 rounded-2xl flex items-center justify-center text-6xl sm:text-7xl font-bold transition-all duration-300
                ${!cell && !winner && !draw && isMyTurn ? 'hover:bg-gray-700 hover:scale-105 cursor-pointer active:scale-95' : 'cursor-default'}
                ${winningLine?.includes(index) ? 'bg-gray-700 ring-4 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] z-20 scale-105' : ''}
              `}
            >
              <span className={`transition-all duration-300 ease-out transform ${cell ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-45'} 
                ${cell === 'X' ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 
                  cell === 'O' ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]' : ''}`}>
                {cell}
              </span>
            </button>
          ))}
        </div>
      </div>

      {(winner || draw) && (
        <div className="mt-12 flex flex-col items-center animate-fade-in-up">
           {(!isAI && room?.players[playerId || '']?.rematch) ? (
             <p className="text-xl text-yellow-500 font-bold mb-4 animate-pulse">Waiting for opponent to accept rematch...</p>
           ) : (
             <button
               onClick={handleRematch}
               className="px-10 py-5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl text-2xl transition-all shadow-xl shadow-green-900/40 hover:scale-105 active:scale-95"
             >
               Play Again
             </button>
           )}
        </div>
      )}

      {/* Opponent Disconnected Overlay */}
      {!isAI && room && !opponentConnected && (
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-gray-900 p-8 rounded-3xl border border-red-500/50 shadow-2xl shadow-red-900/20 flex flex-col items-center text-center max-w-md w-full mx-4">
            <span className="text-6xl mb-4">🔌</span>
            <h2 className="text-3xl font-bold text-red-400 mb-2">Opponent Disconnected</h2>
            <p className="text-gray-400 mb-8">Waiting for them to reconnect...</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors w-full"
            >
              Leave Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
