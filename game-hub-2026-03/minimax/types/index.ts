export type GameType = 'tictactoe' | 'rockpaperscissors';
export type GameMode = 'ai' | 'multiplayer';

export type Player = 'X' | 'O' | 'R' | 'P' | 'S';
export type TTTPlayer = 'X' | 'O';
export type RPSPlayer = 'R' | 'P' | 'S';
export type MoveResult = 'win' | 'lose' | 'draw';

export interface Room {
  code: string;
  game: GameType;
  player1: PlayerInfo | null;
  player2: PlayerInfo | null;
  state: GameState;
  createdAt: number;
  expiresAt: number;
  scores: Scores;
  currentRound: number;
  rematchRequests: string[];
}

export interface PlayerInfo {
  id: string;
  name: string;
  player: TTTPlayer | RPSPlayer;
}

export interface Scores {
  player1: number;
  player2: number;
  draws: number;
}

export type GameState = 
  | { status: 'waiting' }
  | { status: 'playing'; board: (TTTPlayer | null)[]; turn: TTTPlayer; winner: TTTPlayer | null; winningLine: number[] | null }
  | { status: 'ttt-result'; winner: TTTPlayer | 'draw'; scores: Scores; round: number; board: (TTTPlayer | null)[]; winningLine: number[] | null }
  | { status: 'rps-choice' }
  | { status: 'rps-waiting'; player1Choice: RPSPlayer }
  | { status: 'rps-reveal'; countdown: number }
  | { status: 'rps-result'; player1Choice: RPSPlayer; player2Choice: RPSPlayer; result: MoveResult; scores: Scores; round: number; bestOf: number; seriesWinner: TTTPlayer | null }
  | { status: 'disconnected'; disconnectedPlayer: string }
  | { status: 'rematch-pending' };

export interface TTTSquare {
  value: TTTPlayer | null;
  index: number;
}

export interface RPSChoice {
  player: RPSPlayer;
  icon: string;
  beats: RPSPlayer;
}

export const RPS_CHOICES: RPSChoice[] = [
  { player: 'R', icon: '✊', beats: 'S' },
  { player: 'P', icon: '✋', beats: 'R' },
  { player: 'S', icon: '✌️', beats: 'P' },
];

export function getRPSText(choice: RPSPlayer): string {
  switch (choice) {
    case 'R': return 'Rock';
    case 'P': return 'Paper';
    case 'S': return 'Scissors';
  }
}

export function determineRPSWinner(player1: RPSPlayer, player2: RPSPlayer): MoveResult {
  if (player1 === player2) return 'draw';
  const player1Choice = RPS_CHOICES.find(c => c.player === player1);
  if (player1Choice?.beats === player2) return 'win';
  return 'lose';
}
