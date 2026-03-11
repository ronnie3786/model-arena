'use client';

import { useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { playMoveSound, playWinSound, playLoseSound, playDrawSound, playClickSound, playCountdownSound, playRevealSound } from '@/app/lib/sounds';

type Choice = 'rock' | 'paper' | 'scissors';

const CHOICE_EMOJI: Record<string, string> = {
  rock: '\u270A',
  paper: '\u270B',
  scissors: '\u270C',
};

const CHOICE_LABELS: Record<string, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
};

function resolveRPS(p1: Choice, p2: Choice): 'win' | 'lose' | 'draw' {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) return 'win';
  return 'lose';
}

function getRandomChoice(): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * 3)];
}

interface Round {
  playerChoice: Choice;
  aiChoice: Choice;
  result: 'win' | 'lose' | 'draw';
}

function RPSAIInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get('name') || 'Player';

  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [seriesWinner, setSeriesWinner] = useState<'player' | 'ai' | null>(null);

  const [myChoice, setMyChoice] = useState<Choice | null>(null);
  const [aiChoice, setAiChoice] = useState<Choice | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState<'win' | 'lose' | 'draw' | null>(null);

  const handleChoice = useCallback((choice: Choice) => {
    if (myChoice || seriesWinner) return;
    playMoveSound();

    const aiPick = getRandomChoice();
    setMyChoice(choice);
    setAiChoice(aiPick);

    // Start countdown
    setShowCountdown(true);
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(interval);
        setShowCountdown(false);
        setCountdown(0);

        // Reveal
        const result = resolveRPS(choice, aiPick);
        setRoundResult(result);
        setShowResult(true);
        playRevealSound();

        if (result === 'win') {
          playWinSound();
        } else if (result === 'lose') {
          playLoseSound();
        } else {
          playDrawSound();
        }

        // Update scores and rounds
        const newRound: Round = { playerChoice: choice, aiChoice: aiPick, result };
        setRounds(prev => [...prev, newRound]);

        const newPlayerScore = playerScore + (result === 'win' ? 1 : 0);
        const newAiScore = aiScore + (result === 'lose' ? 1 : 0);
        setPlayerScore(newPlayerScore);
        setAiScore(newAiScore);

        // Check series (first to 3 wins; ties get extra rounds)
        if (newPlayerScore >= 3) {
          setSeriesWinner('player');
        } else if (newAiScore >= 3) {
          setSeriesWinner('ai');
        } else if (currentRound >= 4 && newPlayerScore !== newAiScore) {
          setSeriesWinner(newPlayerScore > newAiScore ? 'player' : 'ai');
        }
      } else {
        setCountdown(count);
        playCountdownSound();
      }
    }, 700);
  }, [myChoice, seriesWinner, playerScore, aiScore, currentRound]);

  const handleNextRound = useCallback(() => {
    playClickSound();
    setMyChoice(null);
    setAiChoice(null);
    setShowResult(false);
    setRoundResult(null);
    setCurrentRound(prev => prev + 1);
  }, []);

  const handlePlayAgain = useCallback(() => {
    playClickSound();
    setCurrentRound(0);
    setRounds([]);
    setPlayerScore(0);
    setAiScore(0);
    setSeriesWinner(null);
    setMyChoice(null);
    setAiChoice(null);
    setShowCountdown(false);
    setShowResult(false);
    setRoundResult(null);
  }, []);

  const getRoundBadge = (i: number) => {
    if (i >= rounds.length) return null;
    return rounds[i].result;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 page-enter">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { playClickSound(); router.push('/'); }} className="text-gray-400 hover:text-white transition-colors text-sm">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-purple-400">RPS vs AI</h1>
          <div className="w-16" />
        </div>

        {/* Players & Scores */}
        <div className="flex justify-between items-center bg-gray-900/60 rounded-xl p-3 mb-4">
          <div className="text-center">
            <p className="text-sm font-semibold">{playerName}</p>
            <p className="text-2xl font-bold text-purple-400">{playerScore}</p>
          </div>
          <div className="text-gray-500 text-sm">Best of 5</div>
          <div className="text-center">
            <p className="text-sm font-semibold">AI</p>
            <p className="text-2xl font-bold text-purple-300">{aiScore}</p>
          </div>
        </div>

        {/* Round progress */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: 5 }, (_, i) => {
            const result = getRoundBadge(i);
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i === currentRound && !seriesWinner
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : result === 'win'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : result === 'lose'
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : result === 'draw'
                    ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                    : 'border-gray-700 bg-gray-800/50 text-gray-600'
                }`}
              >
                {result === 'win' ? 'W' : result === 'lose' ? 'L' : result === 'draw' ? 'D' : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Countdown overlay */}
      {showCountdown && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-8xl font-bold text-purple-400 animate-count-pulse" key={countdown}>
            {countdown}
          </div>
        </div>
      )}

      {/* Result */}
      {showResult && !seriesWinner && (
        <div className="mb-6 text-center animate-fade-in-up">
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">You</p>
              <div className="text-6xl animate-flip-in">{CHOICE_EMOJI[myChoice || '']}</div>
              <p className="text-sm text-gray-300 mt-1">{CHOICE_LABELS[myChoice || '']}</p>
            </div>
            <div className="text-2xl font-bold text-gray-500">vs</div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">AI</p>
              <div className="text-6xl animate-flip-in" style={{ animationDelay: '0.2s' }}>
                {CHOICE_EMOJI[aiChoice || '']}
              </div>
              <p className="text-sm text-gray-300 mt-1">{CHOICE_LABELS[aiChoice || '']}</p>
            </div>
          </div>
          <p className={`text-xl font-bold mb-4 ${
            roundResult === 'win' ? 'text-green-400' :
            roundResult === 'lose' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {roundResult === 'win' ? 'You Win!' : roundResult === 'lose' ? 'You Lose!' : 'Draw!'}
          </p>
          {!seriesWinner && (
            <button
              onClick={handleNextRound}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
            >
              Next Round
            </button>
          )}
        </div>
      )}

      {/* Choice buttons */}
      {!seriesWinner && !showCountdown && !showResult && (
        <div className="mb-6">
          <p className="text-center text-gray-400 text-sm mb-4">Round {currentRound + 1} - Make your choice!</p>
          <div className="flex gap-4 sm:gap-6">
            {(['rock', 'paper', 'scissors'] as const).map(choice => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                className="group flex flex-col items-center gap-2 p-4 sm:p-6 bg-gray-800/80 hover:bg-purple-900/40 border-2 border-gray-700 hover:border-purple-500 rounded-2xl transition-all duration-200 hover:scale-105"
              >
                <span className="text-5xl sm:text-6xl group-hover:scale-110 transition-transform">{CHOICE_EMOJI[choice]}</span>
                <span className="text-sm text-gray-400 group-hover:text-purple-300 transition-colors">{CHOICE_LABELS[choice]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Series result */}
      {seriesWinner && (
        <div className="text-center animate-fade-in-up mb-6">
          <div className={`text-4xl font-bold mb-2 ${seriesWinner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
            {seriesWinner === 'player' ? 'You Win the Series!' : 'AI Wins the Series!'}
          </div>
          <p className="text-gray-400 mb-6">
            Final Score: {playerScore} - {aiScore}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={() => { playClickSound(); router.push('/'); }}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Round history */}
      {rounds.length > 0 && (
        <div className="w-full max-w-sm bg-gray-900/60 rounded-xl p-4 mt-4">
          <p className="text-sm text-gray-400 mb-3">Round History</p>
          <div className="space-y-2">
            {rounds.map((round, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">R{i + 1}</span>
                <div className="flex items-center gap-2">
                  <span>{CHOICE_EMOJI[round.playerChoice]}</span>
                  <span className="text-gray-600">vs</span>
                  <span>{CHOICE_EMOJI[round.aiChoice]}</span>
                </div>
                <span className={
                  round.result === 'win' ? 'text-green-400' :
                  round.result === 'lose' ? 'text-red-400' : 'text-yellow-400'
                }>
                  {round.result === 'win' ? 'Win' : round.result === 'lose' ? 'Loss' : 'Draw'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RPSAI() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <RPSAIInner />
    </Suspense>
  );
}
