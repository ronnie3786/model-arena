'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Room, RPSPlayer, RPS_CHOICES, GameState } from '@/types';
import { playClickSound, playCountdownSound, playWinSound, playLoseSound, playDrawSound } from '@/lib/audio';

export default function RockPaperScissorsMultiplayer() {
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
  const [localChoice, setLocalChoice] = useState<RPSPlayer | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [showCountdown, setShowCountdown] = useState(false);

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
      
      if (data.state.status === 'rps-result') {
        const isP1 = data.player1?.id === playerId;
        const result = isP1 ? data.state.result : (data.state.result === 'win' ? 'lose' : data.state.result === 'lose' ? 'win' : 'draw');
        
        setTimeout(() => {
          if (result === 'win') playWinSound();
          else if (result === 'lose') playLoseSound();
          else playDrawSound();
        }, 500);
      }
    };
    
    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [code, playerId]);

  const makeChoice = async (choice: RPSPlayer) => {
    if (!room) return;
    playClickSound();
    setLocalChoice(choice);
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, playerId, rpsChoice: choice }),
      });
      
      const data = await response.json();
      if (!data.error) {
        setRoom(data);
        
        if (data.state.status === 'rps-waiting') {
          setShowCountdown(true);
          let count = 3;
          const countInterval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count > 0) playCountdownSound();
            
            if (count === 0) {
              clearInterval(countInterval);
              setShowCountdown(false);
            }
          }, 1000);
        }
      }
    } catch {
      console.error('Failed to make choice');
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
        setLocalChoice(null);
      }
    } catch {
      console.error('Failed to request rematch');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || 'Room not found'}</p>
          <button onClick={() => router.push('/')} className="btn-primary btn-rps">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (room.state.status === 'waiting') {
    return (
      <RPSWaitingScreen 
        room={room} 
        connected={connected}
        onCopyLink={() => {
          navigator.clipboard.writeText(`${window.location.origin}/rockpaperscissors/${code}?name=${encodeURIComponent(playerName)}`);
        }}
      />
    );
  }

  const isP1 = room.player1?.id === playerId;
  const state = room.state as Extract<GameState, { status: 'rps-choice' | 'rps-waiting' | 'rps-result' }>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4">
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

        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-purple-400 mb-2">Rock Paper Scissors</h1>
          <p className="text-gray-400">
            {room.player1?.name} vs {room.player2?.name || 'Waiting...'}
          </p>
          <p className="text-sm text-gray-500">Best of 5 • Round {room.currentRound}</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${
                i < room.scores.player1 + room.scores.player2 + room.scores.draws
                  ? i < room.scores.player1
                    ? isP1 ? 'bg-purple-400' : 'bg-green-400'
                    : i < room.scores.player1 + room.scores.player2
                      ? isP1 ? 'bg-green-400' : 'bg-purple-400'
                      : 'bg-yellow-400'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className={`text-center p-4 rounded-xl ${isP1 ? 'bg-purple-500/20 border border-purple-500' : 'bg-white/5'}`}>
            <p className="text-gray-400 text-sm">{room.player1?.name || 'Player 1'}</p>
            <p className="text-2xl font-bold text-purple-400">{room.scores.player1}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">Draws</p>
            <p className="text-2xl font-bold text-gray-400">{room.scores.draws}</p>
          </div>
          <div className={`text-center p-4 rounded-xl ${!isP1 ? 'bg-purple-500/20 border border-purple-500' : 'bg-white/5'}`}>
            <p className="text-gray-400 text-sm">{room.player2?.name || 'Player 2'}</p>
            <p className="text-2xl font-bold text-purple-400">{room.scores.player2}</p>
          </div>
        </div>

        {state.status === 'rps-choice' && (
          <div className="animate-fade-in">
            <p className="text-center text-lg text-purple-400 mb-6">Choose your weapon!</p>
            <div className="flex justify-center gap-4">
              {RPS_CHOICES.map((choice) => (
                <button
                  key={choice.player}
                  onClick={() => makeChoice(choice.player)}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/5 hover:bg-white/20 hover:scale-110 transition-all text-5xl flex items-center justify-center border-2 border-transparent hover:border-purple-400"
                >
                  {choice.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.status === 'rps-waiting' && (
          <div className="text-center animate-fade-in">
            <p className="text-2xl text-purple-400 mb-4">
              You chose {RPS_CHOICES.find(c => c.player === localChoice)?.icon}
            </p>
            <div className="text-8xl mb-4 animate-pulse">
              {showCountdown ? countdown : '?'}
            </div>
            <p className="text-gray-400">Waiting for opponent...</p>
          </div>
        )}

        {state.status === 'rps-result' && !state.seriesWinner && (
          <div className="text-center animate-scale-in">
            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">{room.player1?.name}</p>
                <div className="w-28 h-28 rounded-2xl bg-purple-500/20 border border-purple-500 flex items-center justify-center text-6xl animate-reveal">
                  {RPS_CHOICES.find(c => c.player === state.player1Choice)?.icon}
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">{room.player2?.name}</p>
                <div className="w-28 h-28 rounded-2xl bg-green-500/20 border border-green-500 flex items-center justify-center text-6xl animate-reveal">
                  {RPS_CHOICES.find(c => c.player === state.player2Choice)?.icon}
                </div>
              </div>
            </div>
            
            <p className={`text-4xl font-bold mb-6 ${
              state.result === 'win' ? 'text-green-400' : state.result === 'lose' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {state.result === 'win' ? 'You Win!' : state.result === 'lose' ? 'You Lose!' : 'Draw!'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => requestRematch(true)} className="btn-primary btn-rps">
                Request Rematch
              </button>
              <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                Leave Game
              </button>
            </div>
          </div>
        )}

        {state.status === 'rps-result' && state.seriesWinner && (
          <div className="text-center animate-scale-in">
            <p className={`text-4xl font-bold mb-4 ${
              (isP1 && state.seriesWinner === 'X') || (!isP1 && state.seriesWinner === 'O') 
                ? 'text-purple-400' : 'text-green-400'
            }`}>
              {(isP1 && state.seriesWinner === 'X') || (!isP1 && state.seriesWinner === 'O')
                ? 'You Win the Series!' : 'You Lose the Series!'}
            </p>
            <p className="text-gray-400 mb-6">Final Score: {room.scores.player1} - {room.scores.draws} - {room.scores.player2}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => requestRematch(true)} className="btn-primary btn-rps">
                Play Again
              </button>
              <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                Back to Home
              </button>
            </div>
          </div>
        )}

        {room.state.status === 'rematch-pending' && (
          <div className="text-center animate-fade-in">
            <p className="text-yellow-400 text-xl mb-4">Waiting for opponent to accept rematch...</p>
            <button onClick={() => requestRematch(false)} className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        )}

        {room.state.status === 'disconnected' && (
          <div className="text-center animate-scale-in">
            <p className="text-red-400 text-xl mb-4">Opponent disconnected</p>
            <button onClick={() => router.push('/')} className="btn-primary btn-rps">
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RPSWaitingScreen({ room, connected, onCopyLink }: { 
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">Waiting for opponent...</h1>
        <p className="text-gray-400 mb-8">Share the room code or link below</p>

        <div className="bg-gray-800/50 rounded-2xl p-8 mb-8">
          <p className="text-gray-400 text-sm mb-2">Room Code</p>
          <p className="text-5xl font-bold text-purple-400 tracking-widest mb-4">{room.code}</p>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
            <span className="text-gray-400 text-sm">{connected ? 'Connected' : 'Connecting...'}</span>
          </div>

          <button
            onClick={copyLink}
            className="w-full px-6 py-3 rounded-xl font-semibold bg-purple-500 hover:bg-purple-600 transition-all"
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
