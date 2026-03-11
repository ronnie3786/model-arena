'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async (game: 'tictactoe' | 'rockpaperscissors', mode: 'ai' | 'multiplayer') => {
    if (mode === 'ai') {
      const name = playerName || 'Player';
      const encodedName = encodeURIComponent(name);
      router.push(`/${game}/ai?name=${encodedName}`);
    } else {
      if (!playerName) {
        setError('Please enter your name');
        return;
      }
      setLoading(true);
      setError('');
      
      try {
        const playerId = Math.random().toString(36).substring(7);
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            game,
            playerId,
            playerName,
          }),
        });
        
        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          const encodedName = encodeURIComponent(playerName);
          router.push(`/${game}/${data.code}?name=${encodedName}&id=${playerId}`);
        }
      } catch {
        setError('Failed to create room');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl sm:text-6xl font-bold text-center mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          Game Hub
        </h1>
        <p className="text-gray-400 text-center mb-12 text-lg">Challenge friends or test your skills against AI</p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="card-game p-8">
            <div className="text-6xl mb-4 text-center">⭕</div>
            <h2 className="text-2xl font-bold text-green-400 mb-4 text-center">Tic-Tac-Toe</h2>
            <p className="text-gray-400 mb-6 text-center">Classic 3x3 grid game. Can you beat the unbeatable AI?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const name = prompt('Enter your name:') || 'Player';
                  setPlayerName(name);
                  createRoom('tictactoe', 'ai');
                }}
                className="btn-primary btn-ttt flex-1"
              >
                Play vs AI
              </button>
              <button
                onClick={() => {
                  const name = prompt('Enter your name:');
                  if (name) {
                    setPlayerName(name);
                    createRoom('tictactoe', 'multiplayer');
                  }
                }}
                disabled={loading}
                className="btn-primary bg-green-600 hover:bg-green-700 flex-1"
              >
                Play with Friend
              </button>
            </div>
          </div>

          <div className="card-game p-8">
            <div className="text-6xl mb-4 text-center">✊✋✌️</div>
            <h2 className="text-2xl font-bold text-purple-400 mb-4 text-center">Rock Paper Scissors</h2>
            <p className="text-gray-400 mb-6 text-center">Best of 5 series. Outsmart your opponent!</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  const name = prompt('Enter your name:') || 'Player';
                  router.push(`/rockpaperscissors/ai?name=${encodeURIComponent(name)}`);
                }}
                className="btn-primary btn-rps flex-1"
              >
                Play vs AI
              </button>
              <button
                onClick={() => {
                  const name = prompt('Enter your name:');
                  if (name) {
                    setPlayerName(name);
                    createRoom('rockpaperscissors', 'multiplayer');
                  }
                }}
                disabled={loading}
                className="btn-primary bg-purple-600 hover:bg-purple-700 flex-1"
              >
                Play with Friend
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">Have a room code?</p>
          <button
            onClick={() => {
              const name = prompt('Enter your name:');
              if (name) {
                setPlayerName(name);
                setShowJoinModal(true);
              }
            }}
            className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
          >
            Join Room
          </button>
        </div>
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 max-w-md w-full animate-scale-in">
            <h2 className="text-2xl font-bold text-white mb-6">Join Room</h2>
            <input
              type="text"
              placeholder="Room Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 mb-4 text-center text-2xl tracking-widest uppercase"
              maxLength={6}
            />
            {error && <p className="text-red-400 text-center mb-4">{error}</p>}
            <button
              onClick={async () => {
                if (!playerName) {
                  const name = prompt('Enter your name:');
                  if (!name) return;
                  setPlayerName(name);
                }
                if (!joinCode) {
                  setError('Please enter room code');
                  return;
                }
                setLoading(true);
                setError('');
                
                try {
                  const playerId = Math.random().toString(36).substring(7);
                  const response = await fetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'join',
                      code: joinCode.toUpperCase(),
                      playerId,
                      playerName,
                    }),
                  });
                  
                  const data = await response.json();
                  if (data.error) {
                    setError(data.error);
                  } else {
                    const gameType = data.game;
                    const encodedName = encodeURIComponent(playerName);
                    router.push(`/${gameType}/${data.code}?name=${encodedName}&id=${playerId}`);
                  }
                } catch {
                  setError('Failed to join room');
                }
                setLoading(false);
              }}
              disabled={loading}
              className="w-full btn-primary bg-purple-500 hover:bg-purple-600"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
            <button
              onClick={() => setShowJoinModal(false)}
              className="w-full mt-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
