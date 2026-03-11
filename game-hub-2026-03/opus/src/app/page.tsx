'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { playClickSound } from './lib/sounds';

export default function Home() {
  const router = useRouter();
  const [showNamePrompt, setShowNamePrompt] = useState<{ game: 'tictactoe' | 'rps'; mode: 'ai' | 'friend' } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const handlePlayAI = (game: 'tictactoe' | 'rps') => {
    playClickSound();
    setShowNamePrompt({ game, mode: 'ai' });
  };

  const handlePlayFriend = (game: 'tictactoe' | 'rps') => {
    playClickSound();
    setShowNamePrompt({ game, mode: 'friend' });
  };

  const handleStartGame = async () => {
    if (!playerName.trim() || !showNamePrompt) return;
    playClickSound();

    if (showNamePrompt.mode === 'ai') {
      const params = new URLSearchParams({ name: playerName.trim(), mode: 'ai' });
      router.push(`/${showNamePrompt.game === 'tictactoe' ? 'tictactoe' : 'rps'}?${params}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: showNamePrompt.game,
          playerName: playerName.trim(),
        }),
      });
      const data = await res.json();
      if (data.room && data.playerId) {
        sessionStorage.setItem(`player_${data.room.id}`, JSON.stringify({
          playerId: data.playerId,
          playerName: playerName.trim(),
          playerNumber: 1,
        }));
        router.push(`/room/${data.room.id}`);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    }
    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim() || !playerName.trim()) return;
    playClickSound();
    setLoading(true);

    try {
      const res = await fetch(`/api/rooms/${joinCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (data.room && data.playerId) {
        sessionStorage.setItem(`player_${data.room.id}`, JSON.stringify({
          playerId: data.playerId,
          playerName: playerName.trim(),
          playerNumber: 2,
        }));
        router.push(`/room/${data.room.id}`);
      } else {
        alert('Room not found or already full');
      }
    } catch {
      alert('Failed to join room');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Title */}
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-5xl sm:text-6xl font-bold mb-3 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          Game Hub
        </h1>
        <p className="text-gray-400 text-lg">Play with friends or challenge the AI</p>
      </div>

      {/* Game Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl w-full mb-8 page-enter">
        {/* Tic Tac Toe Card */}
        <div className="group relative bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8 hover:border-green-500/50 transition-all duration-300 hover:glow-green">
          <div className="mb-6">
            <div className="w-full aspect-square max-w-[180px] mx-auto mb-4 grid grid-cols-3 gap-1.5">
              {['X', 'O', 'X', '', 'X', '', 'O', '', 'O'].map((cell, i) => (
                <div key={i} className="bg-gray-800/80 rounded-lg flex items-center justify-center text-2xl font-bold">
                  <span className={cell === 'X' ? 'text-green-400' : cell === 'O' ? 'text-green-200' : ''}>
                    {cell}
                  </span>
                </div>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">Tic-Tac-Toe</h2>
            <p className="text-gray-400 text-center text-sm">Classic strategy game</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handlePlayAI('tictactoe')}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Play vs AI
            </button>
            <button
              onClick={() => handlePlayFriend('tictactoe')}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500/30 hover:border-green-500/60 font-semibold rounded-xl transition-all duration-200"
            >
              Play with a Friend
            </button>
          </div>
        </div>

        {/* Rock Paper Scissors Card */}
        <div className="group relative bg-gray-900/60 border border-gray-800 rounded-2xl p-6 sm:p-8 hover:border-purple-500/50 transition-all duration-300 hover:glow-purple">
          <div className="mb-6">
            <div className="w-full max-w-[180px] mx-auto mb-4 flex items-center justify-center gap-3 aspect-square">
              <span className="text-5xl" role="img" aria-label="rock">&#x270A;</span>
              <span className="text-5xl" role="img" aria-label="paper">&#x270B;</span>
              <span className="text-5xl" role="img" aria-label="scissors">&#x270C;</span>
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-1">Rock Paper Scissors</h2>
            <p className="text-gray-400 text-center text-sm">Best of 5 showdown</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => handlePlayAI('rps')}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors duration-200"
            >
              Play vs AI
            </button>
            <button
              onClick={() => handlePlayFriend('rps')}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-500/30 hover:border-purple-500/60 font-semibold rounded-xl transition-all duration-200"
            >
              Play with a Friend
            </button>
          </div>
        </div>
      </div>

      {/* Join Room */}
      <button
        onClick={() => { playClickSound(); setShowJoinDialog(true); }}
        className="text-gray-400 hover:text-white transition-colors underline underline-offset-4 text-sm"
      >
        Have a room code? Join a game
      </button>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNamePrompt(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-8 w-full max-w-sm animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-center">Enter your name</h3>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStartGame()}
              placeholder="Your name..."
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNamePrompt(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartGame}
                disabled={!playerName.trim() || loading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                  showNamePrompt.game === 'tictactoe'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {loading ? 'Creating...' : showNamePrompt.mode === 'ai' ? 'Start Game' : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowJoinDialog(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-8 w-full max-w-sm animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-center">Join a Game</h3>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Your name..."
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
            />
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              placeholder="Room code (e.g. ABC123)"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-4 uppercase tracking-widest text-center font-mono"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinDialog(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !joinCode.trim() || loading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
