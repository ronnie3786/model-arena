'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RoomInfo } from '@/app/lib/types';
import { playMoveSound, playWinSound, playLoseSound, playDrawSound, playClickSound, playCountdownSound, playRevealSound } from '@/app/lib/sounds';

interface Props {
  room: RoomInfo;
  playerId: string;
  playerNumber: 1 | 2;
  playerName: string;
  onGoHome: () => void;
}

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

export default function RPSGame({ room, playerId, playerNumber, playerName, onGoHome }: Props) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showResult, setShowResult] = useState(false);
  const [revealedRound, setRevealedRound] = useState(-1);
  const prevRoundRef = useRef(-1);

  const state = room.rpsState;
  const currentRound = state?.rounds[state.currentRound];
  const myCurrentChoice = state && currentRound
    ? (playerNumber === 1 ? currentRound.player1Choice : currentRound.player2Choice)
    : null;
  const opponentCurrentChoice = state && currentRound
    ? (playerNumber === 1 ? currentRound.player2Choice : currentRound.player1Choice)
    : null;
  const bothChosen = currentRound != null && currentRound.player1Choice !== null && currentRound.player2Choice !== null;
  const opponentName = playerNumber === 1
    ? room.player2?.name || 'Player 2'
    : room.player1?.name || 'Player 1';
  const opponentConnected = playerNumber === 1 ? room.player2?.connected : room.player1?.connected;

  // Detect when both players have chosen and trigger countdown
  useEffect(() => {
    if (!state || !currentRound) return;
    if (bothChosen && currentRound.winner !== null && revealedRound !== state.currentRound) {
      setShowCountdown(true);
      setCountdown(3);

      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(countdownInterval);
          setShowCountdown(false);
          setShowResult(true);
          setRevealedRound(state.currentRound);
          playRevealSound();

          // Play result sound
          const roundWinner = currentRound.winner;
          const iAmPlayer1 = playerNumber === 1;
          if (roundWinner === 'draw') {
            playDrawSound();
          } else if ((roundWinner === 'player1' && iAmPlayer1) || (roundWinner === 'player2' && !iAmPlayer1)) {
            playWinSound();
          } else {
            playLoseSound();
          }
        } else {
          setCountdown(count);
          playCountdownSound();
        }
      }, 700);

      return () => clearInterval(countdownInterval);
    }
  }, [bothChosen, currentRound, state, revealedRound, playerNumber]);

  // Reset state when new round starts
  useEffect(() => {
    if (!state) return;
    if (state.currentRound !== prevRoundRef.current && !bothChosen) {
      prevRoundRef.current = state.currentRound;
      setShowResult(false);
      setShowCountdown(false);
    }
  }, [state, bothChosen]);

  const handleChoice = useCallback(async (choice: string) => {
    if (!state || myCurrentChoice !== null) return;
    playMoveSound();

    await fetch(`/api/rooms/${room.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, action: 'rps_move', choice }),
    });
  }, [room.id, playerId, state, myCurrentChoice]);

  const handleRematch = useCallback(async () => {
    playClickSound();
    await fetch(`/api/rooms/${room.id}/rematch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
  }, [room.id, playerId]);

  const getRoundResult = useCallback((roundIndex: number) => {
    if (!state) return null;
    const round = state.rounds[roundIndex];
    if (!round || round.winner === null) return null;
    const iAmPlayer1 = playerNumber === 1;
    if (round.winner === 'draw') return 'draw';
    if ((round.winner === 'player1' && iAmPlayer1) || (round.winner === 'player2' && !iAmPlayer1)) return 'win';
    return 'lose';
  }, [state, playerNumber]);

  if (!state) return null;

  const hasRequestedRematch = room.rematchRequests.includes(playerId);
  const seriesOver = state.seriesWinner !== null;
  const iWonSeries = (state.seriesWinner === 'player1' && playerNumber === 1) || (state.seriesWinner === 'player2' && playerNumber === 2);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 page-enter">
      {/* Header */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onGoHome} className="text-gray-400 hover:text-white transition-colors text-sm">
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-purple-400">Rock Paper Scissors</h1>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${opponentConnected !== false ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {opponentConnected !== false ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Players & Scores */}
        <div className="flex justify-between items-center bg-gray-900/60 rounded-xl p-3 mb-4">
          <div className="text-center">
            <p className="text-sm font-semibold">{playerName}</p>
            <p className="text-2xl font-bold text-purple-400">{playerNumber === 1 ? state.player1Score : state.player2Score}</p>
          </div>
          <div className="text-gray-500 text-sm">
            Best of 5
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">{opponentName}</p>
            <p className="text-2xl font-bold text-purple-300">{playerNumber === 1 ? state.player2Score : state.player1Score}</p>
          </div>
        </div>

        {/* Round progress */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: 5 }, (_, i) => {
            const result = getRoundResult(i);
            return (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i === state.currentRound && !seriesOver
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

      {/* Result reveal */}
      {showResult && !seriesOver && revealedRound === state.currentRound && currentRound?.winner !== null && (
        <div className="mb-6 text-center animate-fade-in-up">
          <div className="flex items-center justify-center gap-8 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">You</p>
              <div className="text-6xl animate-flip-in">{CHOICE_EMOJI[myCurrentChoice || ''] || '?'}</div>
              <p className="text-sm text-gray-300 mt-1">{CHOICE_LABELS[myCurrentChoice || ''] || '...'}</p>
            </div>
            <div className="text-2xl font-bold text-gray-500">vs</div>
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">{opponentName}</p>
              <div className="text-6xl animate-flip-in" style={{ animationDelay: '0.2s' }}>
                {CHOICE_EMOJI[opponentCurrentChoice || ''] || '?'}
              </div>
              <p className="text-sm text-gray-300 mt-1">{CHOICE_LABELS[opponentCurrentChoice || ''] || '...'}</p>
            </div>
          </div>
          <p className={`text-xl font-bold ${
            getRoundResult(state.currentRound) === 'win' ? 'text-green-400' :
            getRoundResult(state.currentRound) === 'lose' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {getRoundResult(state.currentRound) === 'win' ? 'You Win This Round!' :
             getRoundResult(state.currentRound) === 'lose' ? 'You Lose This Round!' : 'Draw!'}
          </p>
        </div>
      )}

      {/* Choice buttons (only when playing and haven't chosen) */}
      {!seriesOver && !showCountdown && !showResult && (
        <div className="mb-6">
          {myCurrentChoice ? (
            <div className="text-center animate-fade-in">
              <div className="text-6xl mb-2">{CHOICE_EMOJI[myCurrentChoice]}</div>
              <p className="text-gray-400 text-sm">
                {bothChosen ? 'Both chose!' : 'Waiting for opponent...'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-center text-gray-400 text-sm mb-4">Round {state.currentRound + 1} - Make your choice!</p>
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
        </div>
      )}

      {/* Series result */}
      {seriesOver && (
        <div className="text-center animate-fade-in-up mb-6">
          <div className={`text-4xl font-bold mb-2 ${iWonSeries ? 'text-green-400' : 'text-red-400'}`}>
            {iWonSeries ? 'You Win the Series!' : 'You Lost the Series!'}
          </div>
          <p className="text-gray-400 mb-6">
            Final Score: {playerNumber === 1 ? state.player1Score : state.player2Score} - {playerNumber === 1 ? state.player2Score : state.player1Score}
          </p>
          <div className="flex gap-3">
            {!hasRequestedRematch ? (
              <button
                onClick={handleRematch}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors"
              >
                Rematch
              </button>
            ) : (
              <button disabled className="px-6 py-3 bg-gray-700 text-gray-400 rounded-xl font-semibold cursor-not-allowed">
                Waiting for opponent...
              </button>
            )}
            <button
              onClick={onGoHome}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Round history */}
      {state.rounds.some(r => r.winner !== null) && (
        <div className="w-full max-w-sm bg-gray-900/60 rounded-xl p-4 mt-4">
          <p className="text-sm text-gray-400 mb-3">Round History</p>
          <div className="space-y-2">
            {state.rounds.map((round, i) => {
              if (round.winner === null) return null;
              const myC = playerNumber === 1 ? round.player1Choice : round.player2Choice;
              const opC = playerNumber === 1 ? round.player2Choice : round.player1Choice;
              const result = getRoundResult(i);
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">R{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <span>{CHOICE_EMOJI[myC || '']}</span>
                    <span className="text-gray-600">vs</span>
                    <span>{CHOICE_EMOJI[opC || '']}</span>
                  </div>
                  <span className={
                    result === 'win' ? 'text-green-400' :
                    result === 'lose' ? 'text-red-400' : 'text-yellow-400'
                  }>
                    {result === 'win' ? 'Win' : result === 'lose' ? 'Loss' : 'Draw'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
