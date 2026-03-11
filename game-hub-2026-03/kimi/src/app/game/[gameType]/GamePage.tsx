'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import TicTacToeGame from '@/components/TicTacToeGame';
import RPSGame from '@/components/RPSGame';
import { Room, GameType, TicTacToeState, RPSState } from '@/types';
import { soundManager } from '@/lib/sound';

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const gameType = params.gameType as GameType;
  const mode = searchParams.get('mode') as 'ai' | 'friend';
  const roomCode = searchParams.get('room');
  const playerId = searchParams.get('player');
  const playerName = searchParams.get('name') || 'Player';

  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [roomExpired, setRoomExpired] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const copyLink = useCallback(() => {
    const link = `${window.location.origin}?join=${roomCode}`;
    navigator.clipboard.writeText(link);
    setShowCopied(true);
    soundManager.playClick();
    setTimeout(() => setShowCopied(false), 2000);
  }, [roomCode]);

  const updateGameState = useCallback(async (gameState: TicTacToeState | RPSState) => {
    if (!roomCode) return;
    
    try {
      await fetch(`/api/rooms/${roomCode}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState }),
      });
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  }, [roomCode]);

  const handlePlayAgain = useCallback(async () => {
    if (!roomCode) return;
    
    let newState: TicTacToeState | RPSState;
    
    if (gameType === 'tic-tac-toe') {
      newState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        scores: room?.gameState ? (room.gameState as TicTacToeState).scores : { X: 0, O: 0, draws: 0 },
      };
    } else {
      newState = {
        player1Choice: null,
        player2Choice: null,
        player1Score: room?.gameState ? (room.gameState as RPSState).player1Score : 0,
        player2Score: room?.gameState ? (room.gameState as RPSState).player2Score : 0,
        roundResult: null,
        roundComplete: false,
        seriesWinner: null,
        rematchRequested: null,
      };
    }
    
    await updateGameState(newState);
  }, [roomCode, gameType, room, updateGameState]);

  const handleRematch = useCallback(async () => {
    if (!roomCode) return;
    
    const newState: RPSState = {
      player1Choice: null,
      player2Choice: null,
      player1Score: 0,
      player2Score: 0,
      roundResult: null,
      roundComplete: false,
      seriesWinner: null,
      rematchRequested: null,
    };
    
    await updateGameState(newState);
  }, [roomCode, updateGameState]);

  useEffect(() => {
    if (mode === 'friend' && roomCode && playerId) {
      const connectSSE = () => {
        const es = new EventSource(`/api/sse?room=${roomCode}&player=${playerId}`);
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'connected':
                setRoom(data.data.room);
                break;
              case 'playerJoined':
                setRoom(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    players: [...prev.players, data.data.player],
                    status: 'playing',
                  };
                });
                soundManager.playWin();
                break;
              case 'gameUpdate':
                setRoom(data.data.room);
                setOpponentDisconnected(false);
                break;
              case 'opponentDisconnected':
                setOpponentDisconnected(true);
                soundManager.playLose();
                break;
              case 'roomExpired':
                setRoomExpired(true);
                es.close();
                break;
              case 'ping':
                setConnected(true);
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE message:', e);
          }
        };

        es.onerror = () => {
          setConnected(false);
          es.close();
        };
      };

      connectSSE();

      const fetchRoom = async () => {
        try {
          const response = await fetch(`/api/rooms/${roomCode}`);
          if (response.ok) {
            const data = await response.json();
            setRoom(data.room);
          }
        } catch (error) {
          console.error('Error fetching room:', error);
        }
      };

      fetchRoom();

      return () => {
        const es = eventSourceRef.current;
        const pingInterval = pingIntervalRef.current;
        if (es) {
          es.close();
        }
        if (pingInterval) {
          clearInterval(pingInterval);
        }
      };
    }
  }, [mode, roomCode, playerId]);

  useEffect(() => {
    if (room?.expiresAt && room.status === 'waiting') {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) {
          setRoomExpired(true);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [room]);

  if (mode === 'friend' && room?.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 sm:p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className={`w-4 h-4 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Waiting for Opponent</h2>
          <p className="text-gray-400 mb-6">Share this code with your friend</p>
          
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-500 mb-2">Room Code</p>
            <p className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-emerald-400">
              {roomCode}
            </p>
          </div>

          {timeLeft !== null && (
            <p className="text-sm text-gray-400 mb-4">
              Room expires in: <span className="text-yellow-400 font-mono">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
            </p>
          )}

          <button
            onClick={copyLink}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors mb-3"
          >
            {showCopied ? 'Copied!' : 'Copy Link'}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>

          {roomExpired && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400">Room expired. No one joined in time.</p>
              <button
                onClick={() => router.push('/')}
                className="mt-2 text-red-400 hover:text-red-300 underline"
              >
                Return to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const GameComponent = gameType === 'tic-tac-toe' ? TicTacToeGame : RPSGame;

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <span>←</span> Back to Lobby
          </button>
          
          {mode === 'friend' && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-400">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8">
          {gameType === 'tic-tac-toe' ? (
            <span className="text-emerald-400">Tic-Tac-Toe</span>
          ) : (
            <span className="text-purple-400">Rock Paper Scissors</span>
          )}
        </h1>

        <GameComponent
          mode={mode === 'ai' ? 'ai' : 'multiplayer'}
          room={room || undefined}
          playerId={playerId || undefined}
          playerName={playerName}
          onGameUpdate={updateGameState}
          onPlayAgain={handlePlayAgain}
          onRematch={handleRematch}
          opponentDisconnected={opponentDisconnected}
        />
      </div>
    </div>
  );
}
