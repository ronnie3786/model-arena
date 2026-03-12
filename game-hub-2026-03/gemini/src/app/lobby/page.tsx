'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const game = searchParams.get('game') || 'ttt';
  const joinCode = searchParams.get('code');

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Generate random id
    if (!localStorage.getItem('playerId')) {
      localStorage.setItem('playerId', Math.random().toString(36).substring(2, 15));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    
    const playerId = localStorage.getItem('playerId');

    try {
      if (joinCode) {
        // Join room
        const res = await fetch('/api/room', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: joinCode, playerId, playerName: name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to join');
        router.push(`/${data.room.game}?roomId=${joinCode}`);
      } else {
        // Create room
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ game, playerId, playerName: name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Failed to create room');
        router.push(`/${game}?roomId=${data.roomId}`);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white">
      <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {joinCode ? 'Join Room' : 'Create Room'}
        </h1>
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your name"
              required
              autoFocus
              maxLength={15}
            />
          </div>
          {joinCode && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Room Code</label>
              <input
                type="text"
                value={joinCode}
                disabled
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed uppercase"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-4 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            ) : (
              joinCode ? 'Join Game' : 'Create Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Lobby() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white">Loading...</div>}>
      <LobbyContent />
    </Suspense>
  );
}
