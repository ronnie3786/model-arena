export type GameType = 'tic-tac-toe' | 'rock-paper-scissors';
export type Player = 'X' | 'O';
export type RPSChoice = 'rock' | 'paper' | 'scissors';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerInfo {
  id: string;
  name: string;
  symbol?: Player;
  isConnected: boolean;
  lastPing: number;
}

export interface TicTacToeState {
  board: (Player | null)[];
  currentPlayer: Player;
  winner: Player | 'draw' | null;
  winningLine: number[] | null;
  scores: {
    X: number;
    O: number;
    draws: number;
  };
}

export interface RPSState {
  player1Choice: RPSChoice | null;
  player2Choice: RPSChoice | null;
  player1Score: number;
  player2Score: number;
  roundResult: 'player1' | 'player2' | 'draw' | null;
  roundComplete: boolean;
  seriesWinner: 'player1' | 'player2' | null;
  rematchRequested: string | null;
}

export interface Room {
  id: string;
  code: string;
  gameType: GameType;
  status: GameStatus;
  players: PlayerInfo[];
  createdAt: number;
  expiresAt: number;
  gameState: TicTacToeState | RPSState;
  spectators: string[];
}

export interface RoomEvent {
  type: 'playerJoined' | 'playerLeft' | 'gameUpdate' | 'roomExpired' | 'ping' | 'opponentDisconnected' | 'rematchRequested' | 'rematchAccepted';
  data: unknown;
  timestamp: number;
}
