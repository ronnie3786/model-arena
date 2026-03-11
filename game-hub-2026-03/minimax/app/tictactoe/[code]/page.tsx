'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Room, TTTPlayer, GameState } from '@/types';
import { playMoveSound } from '@/lib/audio';

export default function TicTacToe() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const code = params.code as string;
  const playerId = searchParams.get('id') || '';
  const playerName = decodeURIComponent(searchParams.get('name') || 'Player');
  
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPlayer1 = room?.player1?.id === playerId;
  const isPlayer2 = room?.player2?.id === playerId;
  const myPlayer: TTTPlayer | null = isPlayer1 ? 'X' : (isPlayer2 ? 'O' : null);

  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms?code=${code}`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRoom(data);
      }
    } catch {
      setError('Failed to fetch room');
    }
    setLoading(false);
  }, [code]);

  useEffect(() => {
    fetchRoom();
    
    const interval = setInterval(fetchRoom, 5000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  useEffect(() => {
    if (!code) return;

    const eventSource = new EventSource(`/api/rooms/sse?code=${code}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRoom(data);
      setConnected(true);
    };
    
    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [code]);

  const makeMove = async (index: number) => {
    if (!room || room.state.status !== 'playing') return;
    if (myPlayer !== room.state.turn) return;
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerId, move: index }),
      });
      
      const data = await response.json();
      if (!data.error) {
        setRoom(data);
        playMoveSound();
      }
    } catch {
      console.error('Failed to make move');
    }
  };

  const playAgain = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerId, action: 'play-again' }),
      });
      
      const data = await response.json();
      if (!data.error) {
        setRoom(data);
      }
    } catch {
      console.error('Failed to play again');
    }
  };

  const requestRematch = async (accepted: boolean) => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerId, rematchAccepted: accepted }),
      });
      
      const data = await response.json();
      if (!data.error) {
        setRoom(data);
      }
    } catch {
      console.error('Failed to request rematch');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex items-center justify-center">
        <div className="text-green-400 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Room not found'}</p>
          <button onClick={() => router.push('/')} className="btn-primary btn-ttt">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (room.state.status === 'waiting') {
    return (
      <WaitingScreen 
        room={room} 
        connected={connected}
        onCopyLink={() => {
          navigator.clipboard.writeText(`${window.location.origin}/tictactoe/${code}?name=${encodeURIComponent(playerName)}`);
        }}
      />
    );
  }

  const state = room.state as Extract<GameState, { status: 'playing' } | { status: 'ttt-result' }>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-gray-400 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-400 mb-2">Tic-Tac-Toe</h1>
          <p className="text-gray-400">
            {room.player1?.name} (X) vs {room.player2?.name || 'Waiting...'} (O)
          </p>
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className={`text-center p-4 rounded-xl ${myPlayer === 'X' ? 'bg-green-500/20 border border-green-500' : 'bg-white/5'}`}>
            <p className="text-gray-400 text-sm">{room.player1?.name || 'Player 1'}</p>
            <p className="text-2xl font-bold text-green-400">X</p>
            <p className="text-xl">{room.scores.player1}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">Draws</p>
            <p className="text-2xl font-bold text-gray-400">-</p>
            <p className="text-xl">{room.scores.draws}</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${myPlayer === 'O' ? 'bg-green-500/20 border border-green-500' : 'bg-white/5'}`}>
            <p className="text-gray-400 text-sm">{room.player2?.name || 'Player 2'}</p>
            <p className="text-2xl font-bold text-green-400">O</p>
            <p className="text-xl">{room.scores.player2}</p>
          </div>
        </div>

        {state.status === 'playing' && (
          <div className="text-center mb-4">
            <p className="text-lg">
              {state.turn === myPlayer ? (
                <span className="text-green-400">Your turn</span>
              ) : (
                <span className="text-gray-400">Opponent&apos;s turn</span>
              )}
            </p>
          </div>
        )}

        <div className="relative bg-gray-800/50 p-4 rounded-2xl mb-8">
          <div className="grid grid-cols-3 gap-2">
            {state.status === 'playing' && state.board.map((cell, i) => (
              <button
                key={i}
                onClick={() => makeMove(i)}
                disabled={cell !== null || state.turn !== myPlayer}
                className={`
                  w-20 h-20 sm:w-24 sm:h-24 rounded-xl text-4xl sm:text-5xl font-bold flex items-center justify-center
                  transition-all duration-200
                  ${cell === null ? 'bg-white/5 hover:bg-white/10' : 'bg-white/10'}
                  ${cell === null && state.turn === myPlayer ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  ${cell === 'X' ? 'text-green-400' : 'text-purple-400'}
                `}
              >
                {cell && (
                  <span className="animate-fade-in">{cell}</span>
                )}
              </button>
            ))}
          </div>
          
          {state.status === 'playing' && state.winningLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ padding: '1rem' }}>
              {(() => {
                const line = state.winningLine;
                const indices = [0, 1, 2].map(i => {
                  const row = Math.floor(line[i] / 3);
                  const col = line[i] % 3;
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

        {state.status === 'ttt-result' && (
          <div className="text-center animate-scale-in">
            <p className={`text-3xl font-bold mb-4 ${
              state.winner === 'draw' ? 'text-yellow-400' : 
              (state.winner === myPlayer ? 'text-green-400' : 'text-red-400')
            }`}>
              {state.winner === 'draw' ? "It's a Draw!" : 
               state.winner === myPlayer ? 'You Win!' : 'You Lose!'}
            </p>
            
            {room.player1 && room.player2 ? (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => requestRematch(true)} className="btn-primary btn-ttt">
                  Request Rematch
                </button>
                <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                  Leave Game
                </button>
              </div>
            ) : (
              <button onClick={playAgain} className="btn-primary btn-ttt">
                Play Again
              </button>
            )}
          </div>
        )}

        {room.state.status === 'disconnected' && (
          <div className="text-center animate-scale-in">
            <p className="text-red-400 text-xl mb-4">Opponent disconnected</p>
            <button onClick={() => router.push('/')} className="btn-primary btn-ttt">
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WaitingScreen({ room, connected, onCopyLink }: { 
  room: Room; 
  connected: boolean;
  onCopyLink: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [room.expiresAt]);

  const copyLink = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-950 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <h1 className="text-3xl font-bold text-green-400 mb-2">Waiting for opponent...</h1>
        <p className="text-gray-400 mb-8">Share the room code or link below</p>

        <div className="bg-gray-800/50 rounded-2xl p-8 mb-8">
          <p className="text-gray-400 text-sm mb-2">Room Code</p>
          <p className="text-5xl font-bold text-green-400 tracking-widest mb-4">{room.code}</p>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
            <span className="text-gray-400 text-sm">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>

          <button
            onClick={copyLink}
            className="w-full px-6 py-3 rounded-xl font-semibold bg-green-500 hover:bg-green-600 transition-all"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-8">
          <p className="text-red-400 text-sm">
            Room expires in {timeLeft} seconds if no one joins
          </p>
        </div>

        <button
          onClick={() => window.location.href = '/'}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
