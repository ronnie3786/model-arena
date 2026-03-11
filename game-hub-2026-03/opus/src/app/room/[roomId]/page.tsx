'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RoomInfo, RoomEvent } from '@/app/lib/types';
import { playClickSound } from '@/app/lib/sounds';
import TicTacToeGame from '@/app/components/TicTacToeGame';
import RPSGame from '@/app/components/RPSGame';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [playerName, setPlayerName] = useState<string>('');
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [joinName, setJoinName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [copied, setCopied] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Load session info
  useEffect(() => {
    const stored = sessionStorage.getItem(`player_${roomId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setPlayerId(data.playerId);
      setPlayerName(data.playerName);
      setPlayerNumber(data.playerNumber);
    } else {
      // New visitor - need to join
      setShowJoinPrompt(true);
    }
  }, [roomId]);

  // Fetch room initially
  useEffect(() => {
    if (showJoinPrompt) return;
    fetch(`/api/rooms/${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError('Room not found or expired');
        } else {
          setRoom(data.room);
        }
      })
      .catch(() => setError('Failed to load room'));
  }, [roomId, showJoinPrompt]);

  // SSE connection
  useEffect(() => {
    if (!playerId || showJoinPrompt) return;

    const es = new EventSource(`/api/rooms/${roomId}/stream?playerId=${playerId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const parsed: RoomEvent = JSON.parse(event.data);
        if (parsed.data?.room) {
          setRoom(parsed.data.room as unknown as RoomInfo);
        }
        if (parsed.type === 'player_disconnected') {
          const disconnectedId = parsed.data.playerId as string;
          if (disconnectedId !== playerId) {
            setDisconnected(true);
          }
        }
        if (parsed.type === 'player_joined' || parsed.type === 'game_start') {
          setDisconnected(false);
        }
        if (parsed.type === 'room_expired') {
          setError('Room expired');
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // Will auto-reconnect
    };

    return () => {
      es.close();
    };
  }, [roomId, playerId, showJoinPrompt]);

  // Countdown timer for waiting rooms
  useEffect(() => {
    if (!room || room.status !== 'waiting') return;

    const update = () => {
      const remaining = Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setError('Room expired');
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [room]);

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    playClickSound();

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: joinName.trim() }),
      });
      const data = await res.json();
      if (data.room && data.playerId) {
        sessionStorage.setItem(`player_${roomId}`, JSON.stringify({
          playerId: data.playerId,
          playerName: joinName.trim(),
          playerNumber: 2,
        }));
        setPlayerId(data.playerId);
        setPlayerName(joinName.trim());
        setPlayerNumber(2);
        setRoom(data.room);
        setShowJoinPrompt(false);
      } else {
        setError(data.error || 'Failed to join');
      }
    } catch {
      setError('Failed to join room');
    }
  };

  const handleCopyLink = useCallback(() => {
    playClickSound();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomId]);

  const handleGoHome = () => {
    playClickSound();
    router.push('/');
  };

  // Join prompt
  if (showJoinPrompt) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm animate-fade-in-up">
          <h2 className="text-2xl font-bold mb-2 text-center">Join Game</h2>
          <p className="text-gray-400 text-center mb-6 text-sm">Room: {roomId}</p>
          <input
            type="text"
            value={joinName}
            onChange={e => setJoinName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Enter your name..."
            maxLength={20}
            autoFocus
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
          <button
            onClick={handleJoin}
            disabled={!joinName.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            Join Game
          </button>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in-up">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <button onClick={handleGoHome} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors">
            Back to Lobby
          </button>
        </div>
      </main>
    );
  }

  // Loading
  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 animate-pulse-slow">Loading room...</div>
      </main>
    );
  }

  // Waiting for opponent
  if (room.status === 'waiting') {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isTTT = room.gameType === 'tictactoe';

    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in-up max-w-md w-full">
          <div className="mb-8">
            <div className="animate-pulse-slow mb-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isTTT ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
                <div className={`w-8 h-8 rounded-full animate-ping ${isTTT ? 'bg-green-500/40' : 'bg-purple-500/40'}`} />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Waiting for opponent...</h2>
            <p className="text-gray-400">
              {isTTT ? 'Tic-Tac-Toe' : 'Rock Paper Scissors'}
            </p>
          </div>

          {/* Room Code */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6">
            <p className="text-gray-400 text-sm mb-2">Room Code</p>
            <p className="text-4xl font-mono font-bold tracking-[0.3em] mb-4">{room.id}</p>
            <button
              onClick={handleCopyLink}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                copied
                  ? 'bg-green-600 text-white'
                  : isTTT
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {copied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
          </div>

          {/* Timer */}
          <div className="text-gray-500 text-sm">
            Room expires in{' '}
            <span className={timeLeft <= 30 ? 'text-red-400 font-bold' : 'text-gray-300'}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <button onClick={handleGoHome} className="mt-6 text-gray-500 hover:text-gray-300 text-sm underline underline-offset-4 transition-colors">
            Cancel and go back
          </button>
        </div>
      </main>
    );
  }

  // Game is active or finished - render the appropriate game component
  return (
    <main className="min-h-screen">
      {/* Connection status */}
      {disconnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-xl animate-fade-in text-sm">
          Opponent disconnected
        </div>
      )}

      {room.gameType === 'tictactoe' ? (
        <TicTacToeGame
          room={room}
          playerId={playerId!}
          playerNumber={playerNumber}
          playerName={playerName}
          onGoHome={handleGoHome}
        />
      ) : (
        <RPSGame
          room={room}
          playerId={playerId!}
          playerNumber={playerNumber}
          playerName={playerName}
          onGoHome={handleGoHome}
        />
      )}
    </main>
  );
}
