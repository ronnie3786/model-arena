'use client';

import { useSearchParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import TicTacToe from '@/components/TicTacToe';
import RockPaperScissors from '@/components/RockPaperScissors';
import { Room } from '@/lib/server/store';

// A mock room for local play
export default function LocalGameWrapper() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <LocalGame />
    </React.Suspense>
  );
}

function LocalGame() {
  const searchParams = useSearchParams();
  const gameType = searchParams.get('type') as 'tic-tac-toe' | 'rock-paper-scissors';

  // We could implement the full game logic locally here, or mock a "Room" state and send actions to a local reducer.
  // For AI, a local reducer is much easier since we don't need SSE.
  
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (gameType === 'tic-tac-toe') {
      setRoom({
         id: 'LOCAL',
         gameType: 'tic-tac-toe',
         state: 'playing',
         createdAt: Date.now(),
         players: [
            { id: 'p1', name: 'You', connected: true },
            { id: 'ai', name: 'AI', connected: true }
         ],
         gameData: {
            board: Array(9).fill(null),
            turn: 'p1',
            winner: null,
            winningLine: null,
            scores: { p1: 0, ai: 0 }
         }
      });
    } else if (gameType === 'rock-paper-scissors') {
      setRoom({
         id: 'LOCAL',
         gameType: 'rock-paper-scissors',
         state: 'playing',
         createdAt: Date.now(),
         players: [
            { id: 'p1', name: 'You', connected: true },
            { id: 'ai', name: 'AI', connected: true }
         ],
         gameData: {
            players: { 
               p1: { choice: null, score: 0 },
               ai: { choice: null, score: 0 }
            },
            winner: null,
            round: 1,
            maxRounds: 5
         }
      });
    }
  }, [gameType]);

  const sendAction = (action: string, payload: any) => {
      if (!room) return;
      
      setRoom(prevRoom => {
         if (!prevRoom) return null;
         const newRoom = JSON.parse(JSON.stringify(prevRoom)); // Deep copy

         if (newRoom.gameType === 'tic-tac-toe') {
            const data = newRoom.gameData;
            
            if (action === 'move' && data.turn === 'p1' && !data.board[payload.index] && !data.winner) {
               data.board[payload.index] = 'X';
               checkWinTTT(data, 'p1');
               
               if (!data.winner) {
                  data.turn = 'ai';
                  // AI move
                  setTimeout(() => {
                     setRoom(r => {
                        if (!r || r.gameData.winner) return r;
                        const r2 = JSON.parse(JSON.stringify(r));
                        const aiData = r2.gameData;
                        
                        // Simple AI: random available spot (or optimal if requested)
                        // Requirement asked for "unbeatable" AI. Let's do a simple minimax or at least block/win.
                        const bestMove = getBestMoveTTT(aiData.board, 'O');
                        if (bestMove !== -1) {
                           aiData.board[bestMove] = 'O';
                           checkWinTTT(aiData, 'ai');
                           if (!aiData.winner) {
                              aiData.turn = 'p1';
                           }
                        }
                        return r2;
                     });
                  }, 500);
               }
            } else if (action === 'rematch') {
               data.board = Array(9).fill(null);
               data.winner = null;
               data.winningLine = null;
               data.turn = 'p1';
            }
         } else if (newRoom.gameType === 'rock-paper-scissors') {
            const data = newRoom.gameData;
            
            if (action === 'choice' && !data.players.p1.choice && !data.winner) {
               data.players.p1.choice = payload.choice;
               
               // AI chooses randomly
               const choices = ['rock', 'paper', 'scissors'];
               data.players.ai.choice = choices[Math.floor(Math.random() * choices.length)];
               
               // Evaluate
               const c1 = data.players.p1.choice;
               const c2 = data.players.ai.choice;
               
               if (c1 === c2) {
                 data.winner = 'draw';
               } else if (
                 (c1 === 'rock' && c2 === 'scissors') ||
                 (c1 === 'paper' && c2 === 'rock') ||
                 (c1 === 'scissors' && c2 === 'paper')
               ) {
                 data.winner = 'p1';
                 data.players.p1.score++;
               } else {
                 data.winner = 'ai';
                 data.players.ai.score++;
               }
            } else if (action === 'next_round') {
               data.round++;
               data.winner = null;
               data.players.p1.choice = null;
               data.players.ai.choice = null;
            } else if (action === 'rematch') {
               data.round = 1;
               data.winner = null;
               data.players.p1.choice = null;
               data.players.ai.choice = null;
               data.players.p1.score = 0;
               data.players.ai.score = 0;
            }
         }

         return newRoom;
      });
  };

  // Helper for TTT AI
  const checkWinTTT = (data: any, player: string) => {
      const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      for (const line of winningLines) {
         const [a, b, c] = line;
         if (data.board[a] && data.board[a] === data.board[b] && data.board[a] === data.board[c]) {
            data.winner = player;
            data.winningLine = line;
            data.scores[player]++;
            return;
         }
      }
      if (!data.board.includes(null)) {
         data.winner = 'draw';
      }
  };

  const getBestMoveTTT = (board: any[], player: string): number => {
      // Very basic unbeatable AI using minimax
      const emptySpots = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
      if (emptySpots.length === 0) return -1;
      
      const checkWin = (b: any[], p: string) => {
         const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
         for (let l of lines) {
            if (b[l[0]] === p && b[l[1]] === p && b[l[2]] === p) return true;
         }
         return false;
      }

      const minimax = (newBoard: any[], player: string, depth: number) => {
         const availSpots = newBoard.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
         
         if (checkWin(newBoard, 'X')) return { score: -10 + depth };
         else if (checkWin(newBoard, 'O')) return { score: 10 - depth };
         else if (availSpots.length === 0) return { score: 0 };

         const moves = [];
         for (let i = 0; i < availSpots.length; i++) {
            const move: any = {};
            move.index = availSpots[i];
            newBoard[availSpots[i]] = player;

            if (player === 'O') {
               const result = minimax(newBoard, 'X', depth + 1);
               move.score = result.score;
            } else {
               const result = minimax(newBoard, 'O', depth + 1);
               move.score = result.score;
            }

            newBoard[availSpots[i]] = null;
            moves.push(move);
         }

         let bestMove = 0;
         if (player === 'O') {
            let bestScore = -10000;
            for (let i = 0; i < moves.length; i++) {
               if (moves[i].score > bestScore) {
                  bestScore = moves[i].score;
                  bestMove = i;
               }
            }
         } else {
            let bestScore = 10000;
            for (let i = 0; i < moves.length; i++) {
               if (moves[i].score < bestScore) {
                  bestScore = moves[i].score;
                  bestMove = i;
               }
            }
         }
         return moves[bestMove];
      };

      const best = minimax(board, 'O', 0);
      return best.index !== undefined ? best.index : emptySpots[0];
  };

  if (!room) return <div className="p-8 text-center animate-pulse text-neutral-500">Loading AI...</div>;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      <header className="mb-8 max-w-4xl w-full mx-auto text-center">
         <h1 className="text-2xl font-bold text-neutral-400">Playing vs AI</h1>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center">
         {room.gameType === 'tic-tac-toe' ? (
             <TicTacToe room={room} sendAction={sendAction} />
          ) : (
             <RockPaperScissors room={room} sendAction={sendAction} />
          )}
      </main>
    </div>
  );
}
