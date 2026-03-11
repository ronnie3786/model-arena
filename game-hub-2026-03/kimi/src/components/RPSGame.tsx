'use client';

import { useState, useEffect, useCallback } from 'react';
import { RPSChoice, RPSState, Room } from '@/types';
import { soundManager } from '@/lib/sound';

interface RPSGameProps {
  mode: 'ai' | 'multiplayer';
  room?: Room;
  playerId?: string;
  playerName: string;
  onGameUpdate?: (gameState: RPSState) => void;
  onRematch?: () => void;
  opponentDisconnected?: boolean;
}

const choices: { type: RPSChoice; icon: string; label: string }[] = [
  { type: 'rock', icon: '✊', label: 'Rock' },
  { type: 'paper', icon: '✋', label: 'Paper' },
  { type: 'scissors', icon: '✌️', label: 'Scissors' },
];

export default function RPSGame({
  mode,
  room,
  playerId,
  onGameUpdate,
  onRematch,
  opponentDisconnected,
}: RPSGameProps) {
  const [gameState, setGameState] = useState<RPSState>({
    player1Choice: null,
    player2Choice: null,
    player1Score: 0,
    player2Score: 0,
    roundResult: null,
    roundComplete: false,
    seriesWinner: null,
    rematchRequested: null,
  });

  const [countdown, setCountdown] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [localChoice, setLocalChoice] = useState<RPSChoice | null>(null);

  const isPlayer1 = useCallback(() => {
    if (mode === 'ai') return true;
    if (!room || !playerId) return false;
    return room.players[0]?.id === playerId;
  }, [mode, room, playerId]);

  const getMyChoice = useCallback(() => {
    if (isPlayer1()) return gameState.player1Choice;
    return gameState.player2Choice;
  }, [isPlayer1, gameState]);

  const getOpponentChoice = useCallback(() => {
    if (isPlayer1()) return gameState.player2Choice;
    return gameState.player1Choice;
  }, [isPlayer1, gameState]);

  const determineWinner = (p1: RPSChoice, p2: RPSChoice): 'player1' | 'player2' | 'draw' => {
    if (p1 === p2) return 'draw';
    if (
      (p1 === 'rock' && p2 === 'scissors') ||
      (p1 === 'paper' && p2 === 'rock') ||
      (p1 === 'scissors' && p2 === 'paper')
    ) {
      return 'player1';
    }
    return 'player2';
  };

  const handleChoice = useCallback((choice: RPSChoice) => {
    if (gameState.roundComplete || getMyChoice()) return;

    soundManager.playClick();
    setLocalChoice(choice);

    const newGameState = { ...gameState };
    if (isPlayer1()) {
      newGameState.player1Choice = choice;
    } else {
      newGameState.player2Choice = choice;
    }

    if (mode === 'ai') {
      const aiChoice = choices[Math.floor(Math.random() * 3)].type;
      newGameState.player2Choice = aiChoice;
      
      const result = determineWinner(newGameState.player1Choice!, newGameState.player2Choice);
      newGameState.roundResult = result;
      newGameState.roundComplete = true;
      
      if (result === 'player1') {
        newGameState.player1Score++;
      } else if (result === 'player2') {
        newGameState.player2Score++;
      }

      if (newGameState.player1Score === 3 || newGameState.player2Score === 3) {
        newGameState.seriesWinner = newGameState.player1Score === 3 ? 'player1' : 'player2';
        soundManager.playWin();
      }

      setCountdown(3);
      setRevealing(true);

      let count = 3;
      const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
          soundManager.playCountdown(count);
        } else {
          clearInterval(countdownInterval);
          setCountdown(null);
          soundManager.playReveal();
          setTimeout(() => {
            setGameState(newGameState);
          }, 500);
        }
      }, 800);
    } else {
      setGameState(newGameState);
      if (onGameUpdate) {
        onGameUpdate(newGameState);
      }
    }
  }, [gameState, isPlayer1, mode, onGameUpdate, getMyChoice]);

  useEffect(() => {
    if (room?.gameState && mode === 'multiplayer') {
      const newState = room.gameState as RPSState;
      setGameState(newState);
      setLocalChoice(isPlayer1() ? newState.player1Choice : newState.player2Choice);

      if (newState.player1Choice && newState.player2Choice && !newState.roundComplete) {
        setCountdown(3);
        setRevealing(true);
        
        let count = 3;
        const countdownInterval = setInterval(() => {
          count--;
          if (count > 0) {
            setCountdown(count);
            soundManager.playCountdown(count);
          } else {
            clearInterval(countdownInterval);
            setCountdown(null);
            soundManager.playReveal();
          }
        }, 800);
      }
    }
  }, [room, mode, isPlayer1]);

  const nextRound = () => {
    soundManager.playClick();
    const newState: RPSState = {
      player1Choice: null,
      player2Choice: null,
      player1Score: gameState.player1Score,
      player2Score: gameState.player2Score,
      roundResult: null,
      roundComplete: false,
      seriesWinner: null,
      rematchRequested: null,
    };
    setGameState(newState);
    setLocalChoice(null);
    setRevealing(false);
    if (mode === 'multiplayer' && onGameUpdate) {
      onGameUpdate(newState);
    }
  };

  const requestRematch = () => {
    soundManager.playClick();
    if (mode === 'multiplayer' && onRematch) {
      onRematch();
    } else {
      const newState: RPSState = {
        player1Choice: null,
        player2Choice: null,
        player1Score: 0,
        player2Score: 0,
        roundResult: null,
        roundComplete: false,
        seriesWinner: null,
        rematchRequested: null,
      };
      setGameState(newState);
      setLocalChoice(null);
      setRevealing(false);
    }
  };

  const getResultText = (): { text: string; color: string } => {
    const isPlayer1Result = isPlayer1();
    
    if (gameState.roundResult === 'draw') {
      return { text: 'Draw!', color: 'text-yellow-400' };
    }
    if (gameState.roundResult === 'player1') {
      return { 
        text: isPlayer1Result ? 'You Win!' : 'You Lose!', 
        color: isPlayer1Result ? 'text-emerald-400' : 'text-red-400' 
      };
    }
    return { 
      text: isPlayer1Result ? 'You Lose!' : 'You Win!', 
      color: isPlayer1Result ? 'text-red-400' : 'text-emerald-400' 
    };
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {mode === 'multiplayer' && room && (
        <div className="flex items-center justify-between w-full px-4">
          <div className="text-center">
            <p className="text-purple-400 font-semibold">{room.players[0]?.name}</p>
            <p className="text-xs text-gray-400">
              {gameState.player1Score} - {getMyChoice() ? '✓' : '?'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              {opponentDisconnected ? (
                <span className="text-red-400">Opponent disconnected</span>
              ) : gameState.seriesWinner ? (
                <span className="text-purple-400">Series Over</span>
              ) : (
                <span>Best of 5</span>
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-purple-400 font-semibold">{room.players[1]?.name || 'Waiting...'}</p>
            <p className="text-xs text-gray-400">
              {gameState.player2Score} - {getOpponentChoice() ? '✓' : '?'}
            </p>
          </div>
        </div>
      )}

      {mode === 'ai' && (
        <div className="flex gap-8 text-center">
          <div>
            <p className="text-purple-400 font-bold text-2xl">{gameState.player1Score}</p>
            <p className="text-xs text-gray-400">You</p>
          </div>
          <div className="text-gray-500 text-xl pt-1">vs</div>
          <div>
            <p className="text-gray-400 font-bold text-2xl">{gameState.player2Score}</p>
            <p className="text-xs text-gray-400">AI</p>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div className="text-6xl font-bold text-purple-400 animate-pulse">
          {countdown}
        </div>
      )}

      {revealing && countdown === null && gameState.roundComplete && (
        <div className="flex gap-8 items-center">
          <div className="text-center">
            <div className={`text-6xl mb-2 ${isPlayer1() ? 'text-purple-400' : 'text-gray-400'}`}>
              {choices.find(c => c.type === gameState.player1Choice)?.icon}
            </div>
            <p className="text-xs text-gray-400">
              {mode === 'ai' ? 'You' : room?.players[0]?.name}
            </p>
          </div>
          <div className="text-2xl text-gray-500">vs</div>
          <div className="text-center">
            <div className={`text-6xl mb-2 ${!isPlayer1() ? 'text-purple-400' : 'text-gray-400'}`}>
              {choices.find(c => c.type === gameState.player2Choice)?.icon}
            </div>
            <p className="text-xs text-gray-400">
              {mode === 'ai' ? 'AI' : room?.players[1]?.name}
            </p>
          </div>
        </div>
      )}

      {gameState.roundComplete && !gameState.seriesWinner && (
        <div className={`text-3xl font-bold ${getResultText().color}`}>
          {getResultText().text}
        </div>
      )}

      {gameState.seriesWinner && (
        <div className="text-center">
          <p className={`text-4xl font-bold mb-2 ${
            (isPlayer1() && gameState.seriesWinner === 'player1') || 
            (!isPlayer1() && gameState.seriesWinner === 'player2')
              ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {(isPlayer1() && gameState.seriesWinner === 'player1') || 
             (!isPlayer1() && gameState.seriesWinner === 'player2')
              ? 'You Won the Series!' : 'You Lost the Series!'}
          </p>
          <p className="text-gray-400">
            Final: {gameState.player1Score} - {gameState.player2Score}
          </p>
        </div>
      )}

      {!revealing && !gameState.seriesWinner && (
        <div className="flex gap-4 justify-center flex-wrap">
          {choices.map((choice) => (
            <button
              key={choice.type}
              onClick={() => handleChoice(choice.type)}
              disabled={!!getMyChoice()}
              className={`
                w-24 h-24 sm:w-28 sm:h-28
                bg-gray-800 rounded-xl
                flex flex-col items-center justify-center
                transition-all duration-200
                ${!getMyChoice() ? 'hover:bg-purple-900/50 hover:scale-105 cursor-pointer' : 'opacity-50 cursor-default'}
                ${localChoice === choice.type ? 'ring-2 ring-purple-500 bg-purple-900/30' : ''}
              `}
            >
              <span className="text-4xl sm:text-5xl mb-1">{choice.icon}</span>
              <span className="text-sm text-gray-400">{choice.label}</span>
            </button>
          ))}
        </div>
      )}

      {getMyChoice() && !gameState.roundComplete && (
        <p className="text-purple-400 animate-pulse">Waiting for opponent...</p>
      )}

      {gameState.roundComplete && !gameState.seriesWinner && (
        <button
          onClick={nextRound}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors"
        >
          Next Round
        </button>
      )}

      {gameState.seriesWinner && (
        <button
          onClick={requestRematch}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-colors"
        >
          Rematch
        </button>
      )}
    </div>
  );
}
