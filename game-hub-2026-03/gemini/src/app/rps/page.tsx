'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSound } from '@/lib/useSound';
import { useMultiplayer } from '@/lib/useMultiplayer';
import { WaitingRoom } from '@/components/WaitingRoom';

const CHOICES = [
  { id: 'rock', icon: '✊' },
  { id: 'paper', icon: '✋' },
  { id: 'scissors', icon: '✌️' }
];

import { Suspense } from 'react';

export default function RockPaperScissors() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-white">Loading...</div>}>
      <RockPaperScissorsContent />
    </Suspense>
  );
}

function RockPaperScissorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'ai';
  const roomId = searchParams.get('roomId');
  
  const { playMove, playWin, playLose, playDraw } = useSound();
  // If roomId is in the URL, it's a multiplayer session regardless of mode param
  const { room, connected, playerId, performAction } = useMultiplayer(roomId, !roomId);

  const isAI = !roomId; // roomId in URL means multiplayer session

  // AI State
  const [localRound, setLocalRound] = useState(1);
  const [localP1Choice, setLocalP1Choice] = useState<string | null>(null);
  const [localP2Choice, setLocalP2Choice] = useState<string | null>(null);
  const [localWinner, setLocalWinner] = useState<string | null>(null);
  const [localSeriesWinner, setLocalSeriesWinner] = useState<string | null>(null);
  const [localScores, setLocalScores] = useState({ p1: 0, p2: 0 });
  const [countdown, setCountdown] = useState<number | null>(null);

  // Derived state
  const round = isAI ? localRound : room?.state?.round || 1;
  const p1Choice = isAI ? localP1Choice : room?.state?.player1Choice || null;
  const p2Choice = isAI ? localP2Choice : room?.state?.player2Choice || null;
  const winner = isAI ? localWinner : room?.state?.winner || null;
  const seriesWinner = isAI ? localSeriesWinner : room?.state?.seriesWinner || null;
  
  const isP1 = isAI ? true : room?.state?.playersAssigned?.p1 === playerId;
  const myChoice = isP1 ? p1Choice : p2Choice;
  const opponentChoice = isP1 ? p2Choice : p1Choice;
  
  const opponentConnected = isAI ? true : (room ? (Object.values(room.players) as any[]).find((p: any) => p.id !== playerId)?.connected : false);
  const bothConnected = isAI ? true : (room && Object.keys(room.players).length === 2);

  // AI Logic
  useEffect(() => {
    if (isAI && localP1Choice && !localP2Choice) {
      // AI makes a random choice
      const randomChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)].id;
      setLocalP2Choice(randomChoice);
    }
  }, [isAI, localP1Choice, localP2Choice]);

  const calculateAIWinner = useCallback(() => {
    const c1 = localP1Choice;
    const c2 = localP2Choice;
    
    let roundWinner = null;
    let newScores = { ...localScores };

    if (c1 === c2) {
      roundWinner = 'draw';
    } else if (
      (c1 === 'rock' && c2 === 'scissors') ||
      (c1 === 'paper' && c2 === 'rock') ||
      (c1 === 'scissors' && c2 === 'paper')
    ) {
      roundWinner = 'player1';
      newScores.p1++;
    } else {
      roundWinner = 'player2';
      newScores.p2++;
    }

    setLocalWinner(roundWinner);
    setLocalScores(newScores);

    if (newScores.p1 >= 3) {
      setLocalSeriesWinner('player1');
    } else if (newScores.p2 >= 3) {
      setLocalSeriesWinner('player2');
    }
  }, [localP1Choice, localP2Choice, localScores]);

  // Handle Reveal Animation and Results
  useEffect(() => {
    if ((isAI && localP1Choice && localP2Choice && !localWinner) ||
        (!isAI && p1Choice && p2Choice && !winner && countdown === null)) {
      setCountdown(3);
    }
  }, [isAI, localP1Choice, localP2Choice, localWinner, p1Choice, p2Choice, winner, countdown]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        playMove(); // Tick sound
      }, 800);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
        if (isAI) {
           calculateAIWinner();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [countdown, isAI, playMove, calculateAIWinner]);

  // Play sound on win/lose reveal
  useEffect(() => {
     if (countdown === null && winner) {
        if (winner === 'draw') playDraw();
        else if (winner === (isP1 ? 'player1' : 'player2')) playWin();
        else playLose();
     }
  }, [countdown, winner, isP1, playDraw, playWin, playLose]);

  const handleChoice = (choice: string) => {
    if (myChoice || winner || seriesWinner || countdown !== null) return;
    playMove();
    
    if (isAI) {
      setLocalP1Choice(choice);
    } else {
      performAction('CHOICE', { choice });
    }
  };

  const nextRound = () => {
    if (isAI) {
      setLocalRound(prev => prev + 1);
      setLocalP1Choice(null);
      setLocalP2Choice(null);
      setLocalWinner(null);
    } else {
      performAction('NEXT_ROUND');
    }
  };

  const handleRematch = () => {
    if (isAI) {
      setLocalRound(1);
      setLocalP1Choice(null);
      setLocalP2Choice(null);
      setLocalWinner(null);
      setLocalSeriesWinner(null);
      setLocalScores({ p1: 0, p2: 0 });
    } else {
      performAction('REMATCH');
    }
  };

  if (!isAI && (!room || !bothConnected)) {
    return <WaitingRoom roomId={roomId || ''} room={room} connected={connected} />;
  }

  // Calculate scores
  let scores = { p1: 0, p2: 0 };
  if (isAI) {
    scores = localScores;
  } else if (room) {
    const p1Id = room.state.playersAssigned.p1;
    const p2Id = room.state.playersAssigned.p2;
    scores = {
      p1: room.players[p1Id]?.score || 0,
      p2: room.players[p2Id]?.score || 0,
    };
  }

  const myScore = isP1 ? scores.p1 : scores.p2;
  const opponentScore = isP1 ? scores.p2 : scores.p1;
  const hasWonSeries = seriesWinner === (isP1 ? 'player1' : 'player2');
  const hasLostSeries = seriesWinner && !hasWonSeries;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white font-sans transition-all overflow-hidden relative">
      {/* Top Bar for Multiplayer */}
      {!isAI && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800 z-50">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${connected ? 'bg-purple-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-400">You: {room?.players[playerId || '']?.name || 'Player'}</span>
          </div>
          <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition-colors">
            Exit Game
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              Opponent: {(Object.values(room?.players || {}) as any[]).find((p: any) => p.id !== playerId)?.name || '...'}
            </span>
            <span className={`w-3 h-3 rounded-full ${opponentConnected ? 'bg-purple-500' : 'bg-red-500'}`}></span>
          </div>
        </div>
      )}

      {/* Series Progress Header */}
      <div className="w-full max-w-2xl mt-16 mb-8 flex justify-between items-center bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-2xl">
        <div className="flex flex-col items-center gap-2">
           <span className="text-sm text-gray-400 uppercase tracking-widest font-bold">You</span>
           <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-4 h-4 md:w-6 md:h-6 rounded-full transition-colors ${i < myScore ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-gray-800'}`}></div>
              ))}
           </div>
        </div>
        
        <div className="text-center flex flex-col items-center">
           <span className="text-xs text-purple-400 uppercase tracking-widest font-bold mb-1">Round {round}</span>
           <span className="text-xl md:text-2xl font-black text-white">First to 3</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
           <span className="text-sm text-gray-400 uppercase tracking-widest font-bold">{isAI ? 'AI' : 'Opp'}</span>
           <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`w-4 h-4 md:w-6 md:h-6 rounded-full transition-colors ${i < opponentScore ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'bg-gray-800'}`}></div>
              ))}
           </div>
        </div>
      </div>

      {/* Game Area */}
      {seriesWinner ? (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up z-10 bg-gray-900/80 backdrop-blur-md p-10 rounded-3xl border border-gray-800 w-full max-w-2xl">
           <h1 className={`text-6xl md:text-8xl font-black mb-8 ${hasWonSeries ? 'text-purple-500 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'}`}>
             {hasWonSeries ? 'VICTORY!' : 'DEFEAT'}
           </h1>
           <p className="text-2xl text-gray-300 mb-12">Final Score: {myScore} - {opponentScore}</p>
           
           {(!isAI && room?.players[playerId || '']?.rematch) ? (
             <p className="text-xl text-yellow-500 font-bold mb-4 animate-pulse">Waiting for opponent to accept rematch...</p>
           ) : (
             <button
               onClick={handleRematch}
               className="px-12 py-6 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl text-3xl transition-all shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95"
             >
               Play Again
             </button>
           )}
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-3xl h-full flex-grow justify-center relative z-10">
          
          {/* Opponent Area */}
          <div className={`mb-12 transform transition-all duration-500 ${countdown !== null || winner ? 'scale-125 translate-y-8' : 'scale-100 opacity-50'}`}>
             <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-800 rounded-3xl flex items-center justify-center text-6xl md:text-8xl shadow-lg border border-gray-700 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-700/50 to-transparent"></div>
                
                {countdown !== null ? (
                  <span className="animate-ping font-black text-purple-400 z-10">{countdown > 0 ? countdown : 'GO!'}</span>
                ) : winner || (countdown === 0 && opponentChoice) ? (
                  <span className="z-10 animate-fade-in">{CHOICES.find(c => c.id === opponentChoice)?.icon}</span>
                ) : (
                  <span className="text-gray-600 z-10 font-bold text-4xl">?</span>
                )}
             </div>
             <p className="text-center mt-4 text-gray-500 font-semibold tracking-widest uppercase">{isAI ? 'AI' : 'Opponent'}</p>
          </div>

          {/* VS Divider or Result Text */}
          <div className="h-24 flex items-center justify-center my-4 w-full">
             {countdown !== null ? (
               <div className="text-5xl md:text-7xl font-black text-purple-500 animate-pulse tracking-widest drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                 {countdown > 0 ? countdown : 'SHOOT!'}
               </div>
             ) : winner ? (
               <div className={`text-4xl md:text-6xl font-black animate-bounce tracking-tight py-4 px-8 rounded-2xl
                 ${winner === 'draw' ? 'text-yellow-400 bg-yellow-400/10' : 
                   winner === (isP1 ? 'player1' : 'player2') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}
               `}>
                 {winner === 'draw' ? 'DRAW!' : winner === (isP1 ? 'player1' : 'player2') ? 'YOU WIN!' : 'YOU LOSE!'}
               </div>
             ) : (
               <div className="text-4xl font-black text-gray-700 italic">VS</div>
             )}
          </div>

          {/* Player Area */}
          <div className={`mt-12 flex flex-col items-center transition-all duration-500 ${countdown !== null || winner ? 'scale-125 -translate-y-8' : 'scale-100'}`}>
            {myChoice && (countdown !== null || winner) ? (
              <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-800 rounded-3xl flex items-center justify-center text-6xl md:text-8xl shadow-lg border border-purple-500/50 shadow-purple-900/30 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-tl from-purple-500/20 to-transparent"></div>
                 <span className="z-10">{CHOICES.find(c => c.id === myChoice)?.icon}</span>
              </div>
            ) : (
              <div className="flex gap-4 md:gap-8 justify-center w-full">
                {CHOICES.map(choice => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.id)}
                    disabled={!!myChoice || !!winner || countdown !== null}
                    className={`w-24 h-24 md:w-32 md:h-32 bg-gray-800 rounded-3xl flex items-center justify-center text-5xl md:text-6xl shadow-xl transition-all duration-300 relative overflow-hidden group border border-gray-700
                      ${!myChoice && !winner && countdown === null ? 'hover:bg-gray-700 hover:scale-110 hover:-translate-y-2 cursor-pointer active:scale-95 hover:border-purple-500/50 hover:shadow-purple-900/20' : ''}
                      ${myChoice === choice.id ? 'scale-110 ring-4 ring-purple-500 bg-gray-700 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-20' : 
                        myChoice ? 'opacity-30 scale-90 grayscale' : ''}
                    `}
                  >
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <span className={`transition-transform duration-300 ${!myChoice ? 'group-hover:scale-125' : ''} z-10`}>
                       {choice.icon}
                     </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-center mt-6 text-purple-400 font-bold tracking-widest uppercase">You</p>
          </div>
        </div>
      )}

      {/* Next Round Button */}
      {!seriesWinner && winner && countdown === null && (
        <div className="absolute bottom-10 animate-fade-in-up z-50">
           {(!isAI && room?.players[playerId || '']?.rematch) ? (
             <p className="text-xl text-yellow-500 font-bold animate-pulse bg-gray-900/80 px-6 py-3 rounded-full backdrop-blur-sm border border-gray-800">Waiting for opponent...</p>
           ) : (
             <button
               onClick={nextRound}
               className="px-10 py-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full text-2xl transition-all shadow-xl shadow-purple-900/40 hover:scale-105 active:scale-95 flex items-center gap-3"
             >
               Next Round <span className="text-xl">→</span>
             </button>
           )}
        </div>
      )}

      {/* Waiting for opponent text when you have chosen but they haven't */}
      {!seriesWinner && !winner && myChoice && !opponentChoice && countdown === null && (
         <div className="absolute bottom-10 animate-pulse bg-gray-900/80 px-6 py-3 rounded-full backdrop-blur-sm border border-gray-800 z-40">
            <p className="text-purple-400 font-bold tracking-widest uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
              Waiting for Opponent
            </p>
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
