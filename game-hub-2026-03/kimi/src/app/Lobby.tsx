'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GameType } from '@/types';
import { soundManager } from '@/lib/sound';

interface GameCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPlayAI: () => void;
  onPlayFriend: () => void;
}

function GameCard({ title, description, icon, color, onPlayAI, onPlayFriend }: GameCardProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center transition-transform hover:scale-105">
      <div 
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl mb-4"
        style={{ backgroundColor: color + '20', color }}
      >
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-400 mb-6 text-sm sm:text-base">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onPlayAI}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors"
          style={{ backgroundColor: color, color: '#000' }}
          onMouseEnter={() => soundManager.playClick()}
        >
          Play vs AI
        </button>
        <button
          onClick={onPlayFriend}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors border-2"
          style={{ borderColor: color, color }}
          onMouseEnter={() => soundManager.playClick()}
        >
          Play with a Friend
        </button>
      </div>
    </div>
  );
}

export default function Lobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    const joinParam = searchParams.get('join');
    if (joinParam) {
      setJoinCode(joinParam.toUpperCase());
      setShowJoinModal(true);
    }
  }, [searchParams]);

  const handlePlay = (game: GameType, mode: 'ai' | 'friend') => {
    setSelectedGame(game);

    if (mode === 'ai') {
      setShowNameModal(true);
    } else {
      setShowJoinModal(true);
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim() || !selectedGame) return;

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: selectedGame,
          playerName: playerName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/game/${selectedGame}?mode=friend&room=${data.room.code}&player=${data.playerId}`);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !joinCode.trim()) return;

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const gameType = data.room.gameType;
        router.push(`/game/${gameType}?mode=friend&room=${data.room.code}&player=${data.playerId}`);
      } else {
        alert('Room not found or full');
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleStartAI = () => {
    if (!playerName.trim() || !selectedGame) return;
    router.push(`/game/${selectedGame}?mode=ai&name=${encodeURIComponent(playerName.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-emerald-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Game Hub
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl">
            Challenge friends or test your skills against AI
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          <GameCard
            title="Tic-Tac-Toe"
            description="Classic 3x3 strategy game. Get three in a row to win! Features unbeatable AI."
            icon="⭕"
            color="#34d399"
            onPlayAI={() => handlePlay('tic-tac-toe', 'ai')}
            onPlayFriend={() => handlePlay('tic-tac-toe', 'friend')}
          />
          <GameCard
            title="Rock Paper Scissors"
            description="The classic hand game. Best of 5 series. Choose wisely!"
            icon="✊"
            color="#a78bfa"
            onPlayAI={() => handlePlay('rock-paper-scissors', 'ai')}
            onPlayFriend={() => handlePlay('rock-paper-scissors', 'friend')}
          />
        </div>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Enter Your Name</h3>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleStartAI()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartAI}
                disabled={!playerName.trim()}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Play
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Play with a Friend</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>

            <div className="border-t border-gray-700 my-4 pt-4">
              <p className="text-sm text-gray-400 mb-3">Have a room code?</p>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-500 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || joinCode.length !== 6}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Join Room
              </button>
            </div>

            <div className="border-t border-gray-700 my-4 pt-4">
              <p className="text-sm text-gray-400 mb-3">Or create a new room</p>
              <button
                onClick={handleCreateRoom}
                disabled={!playerName.trim()}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                Create Room
              </button>
            </div>

            <button
              onClick={() => setShowJoinModal(false)}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors mt-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
