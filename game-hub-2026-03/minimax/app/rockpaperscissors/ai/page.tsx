'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RPSPlayer, RPS_CHOICES, determineRPSWinner, MoveResult } from '@/types';
import { playClickSound, playCountdownSound, playRevealSound, playWinSound, playLoseSound, playDrawSound } from '@/lib/audio';

function RockPaperScissorsAIContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const playerName = decodeURIComponent(searchParams.get('name') || 'Player');
  
  const [gameState, setGameState] = useState<'choice' | 'waiting' | 'reveal' | 'result'>('choice');
  const [countdown, setCountdown] = useState(3);
  const [playerChoice, setPlayerChoice] = useState<RPSPlayer | null>(null);
  const [aiChoice, setAiChoice] = useState<RPSPlayer | null>(null);
  const [result, setResult] = useState<MoveResult | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [round, setRound] = useState(1);
  const [seriesWinner, setSeriesWinner] = useState<'player' | 'ai' | null>(null);
  const [showSeriesResult, setShowSeriesResult] = useState(false);

  const bestOf5 = 5;

  const makeChoice = (choice: RPSPlayer) => {
    playClickSound();
    setPlayerChoice(choice);
    setGameState('waiting');
    
    const choices: RPSPlayer[] = ['R', 'P', 'S'];
    const ai = choices[Math.floor(Math.random() * 3)];
    setAiChoice(ai);
    
    let count = 3;
    const countInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count > 0) playCountdownSound();
      
      if (count === 0) {
        clearInterval(countInterval);
        playRevealSound();
        
        const gameResult = determineRPSWinner(choice, ai);
        setResult(gameResult);
        setGameState('reveal');
        
        setTimeout(() => {
          setGameState('result');
          
          const newScores = { ...scores };
          if (gameResult === 'win') {
            newScores.player++;
            playWinSound();
          } else if (gameResult === 'lose') {
            newScores.ai++;
            playLoseSound();
          } else {
            newScores.draws++;
            playDrawSound();
          }
          setScores(newScores);
          
          if (newScores.player >= Math.ceil(bestOf5 / 2)) {
            setSeriesWinner('player');
            setShowSeriesResult(true);
          } else if (newScores.ai >= Math.ceil(bestOf5 / 2)) {
            setSeriesWinner('ai');
            setShowSeriesResult(true);
          }
        }, 1500);
      }
    }, 1000);
  };

  const nextRound = () => {
    setGameState('choice');
    setPlayerChoice(null);
    setAiChoice(null);
    setResult(null);
    setCountdown(3);
    setRound(r => r + 1);
  };

  const resetSeries = () => {
    setScores({ player: 0, ai: 0, draws: 0 });
    setRound(1);
    setSeriesWinner(null);
    setShowSeriesResult(false);
    setGameState('choice');
    setPlayerChoice(null);
    setAiChoice(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white transition-colors">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-purple-400">Rock Paper Scissors</h1>
          <div></div>
        </div>

        <div className="text-center mb-4">
          <p className="text-gray-400 mb-2">
            <span className="text-purple-400">{playerName}</span> vs <span className="text-green-400">AI</span>
          </p>
          <p className="text-sm text-gray-500">Best of {bestOf5} • Round {round}</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: bestOf5 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${
                i < scores.player + scores.ai + scores.draws
                  ? i < scores.player
                    ? 'bg-purple-400'
                    : i < scores.player + scores.ai
                      ? 'bg-green-400'
                      : 'bg-yellow-400'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">{playerName}</p>
            <p className="text-2xl font-bold text-purple-400">{scores.player}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">Draws</p>
            <p className="text-2xl font-bold text-gray-400">{scores.draws}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5">
            <p className="text-gray-400 text-sm">AI</p>
            <p className="text-2xl font-bold text-green-400">{scores.ai}</p>
          </div>
        </div>

        {gameState === 'choice' && (
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

        {gameState === 'waiting' && (
          <div className="text-center animate-fade-in">
            <p className="text-2xl text-purple-400 mb-4">You chose {RPS_CHOICES.find(c => c.player === playerChoice)?.icon}</p>
            <div className="text-8xl mb-4 animate-pulse">
              {countdown}
            </div>
            <p className="text-gray-400">Get ready...</p>
          </div>
        )}

        {gameState === 'reveal' && (
          <div className="text-center animate-scale-in">
            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">{playerName}</p>
                <div className="w-28 h-28 rounded-2xl bg-purple-500/20 border border-purple-500 flex items-center justify-center text-6xl animate-reveal">
                  {RPS_CHOICES.find(c => c.player === playerChoice)?.icon}
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">AI</p>
                <div className="w-28 h-28 rounded-2xl bg-green-500/20 border border-green-500 flex items-center justify-center text-6xl animate-reveal">
                  {RPS_CHOICES.find(c => c.player === aiChoice)?.icon}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'result' && !showSeriesResult && (
          <div className="text-center animate-scale-in">
            <p className={`text-4xl font-bold mb-6 ${
              result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {result === 'win' ? 'You Win!' : result === 'lose' ? 'You Lose!' : 'Draw!'}
            </p>
            <button onClick={nextRound} className="btn-primary btn-rps">
              Next Round
            </button>
          </div>
        )}

        {showSeriesResult && (
          <div className="text-center animate-scale-in">
            <p className={`text-4xl font-bold mb-4 ${
              seriesWinner === 'player' ? 'text-purple-400' : 'text-green-400'
            }`}>
              {seriesWinner === 'player' ? 'You Win the Series!' : 'AI Wins the Series!'}
            </p>
            <p className="text-gray-400 mb-6">Final Score: {scores.player} - {scores.draws} - {scores.ai}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={resetSeries} className="btn-primary btn-rps">
                Play Again
              </button>
              <button onClick={() => router.push('/')} className="px-6 py-3 rounded-xl font-semibold border border-white/20 bg-white/5 hover:bg-white/10 transition-all">
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RockPaperScissorsAI() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">Loading...</div>
      </div>
    }>
      <RockPaperScissorsAIContent />
    </Suspense>
  );
}
