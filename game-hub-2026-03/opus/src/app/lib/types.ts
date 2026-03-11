export type GameType = 'tictactoe' | 'rps';

export type TTTCell = 'X' | 'O' | null;
export type TTTBoard = TTTCell[];
export type RPSChoice = 'rock' | 'paper' | 'scissors' | null;

export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface TTTGameState {
  board: TTTBoard;
  currentTurn: 'X' | 'O'; // player1 is always X, player2 is always O
  winner: 'X' | 'O' | 'draw' | null;
  winningLine: number[] | null;
  scores: { player1: number; player2: number; draws: number };
}

export interface RPSRound {
  player1Choice: RPSChoice;
  player2Choice: RPSChoice;
  winner: 'player1' | 'player2' | 'draw' | null; // null means round not complete
}

export interface RPSGameState {
  currentRound: number; // 0-indexed
  rounds: RPSRound[];
  seriesWinner: 'player1' | 'player2' | null;
  player1Score: number;
  player2Score: number;
}

export interface Room {
  id: string;
  gameType: GameType;
  player1: Player | null;
  player2: Player | null;
  createdAt: number;
  expiresAt: number;
  status: 'waiting' | 'playing' | 'finished';
  tttState: TTTGameState | null;
  rpsState: RPSGameState | null;
  rematchRequests: Set<string>; // player IDs that requested rematch
}

export interface RoomEvent {
  type: 'player_joined' | 'game_start' | 'move' | 'game_over' | 'player_disconnected' | 'rematch_requested' | 'rematch_accepted' | 'room_expired' | 'state_sync';
  data: Record<string, unknown>;
  timestamp: number;
}

// Client-safe room (no Set, serializable)
export interface RoomInfo {
  id: string;
  gameType: GameType;
  player1: Player | null;
  player2: Player | null;
  status: 'waiting' | 'playing' | 'finished';
  tttState: TTTGameState | null;
  rpsState: RPSGameState | null;
  rematchRequests: string[];
  expiresAt: number;
}
