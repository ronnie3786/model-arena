// ─── Room / Multiplayer ───────────────────────────────────────────────────────

export type GameType = "ttt" | "rps";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface Room {
  id: string;
  code: string;
  gameType: GameType;
  status: RoomStatus;
  players: [Player | null, Player | null]; // [host, guest]
  createdAt: number;
  expiresAt: number;
  gameState: TTTState | RPSState | null;
  rematchVotes: string[]; // player ids
}

// ─── Tic-Tac-Toe ─────────────────────────────────────────────────────────────

export type TTTCell = "X" | "O" | null;
export type TTTBoard = TTTCell[];
export type TTTWinner = "X" | "O" | "draw" | null;

export interface TTTState {
  board: TTTBoard;
  currentTurn: "X" | "O";
  winner: TTTWinner;
  winLine: number[] | null;
  scores: { X: number; O: number; draws: number };
}

// ─── Rock Paper Scissors ──────────────────────────────────────────────────────

export type RPSChoice = "rock" | "paper" | "scissors" | null;
export type RPSRoundResult = "win" | "lose" | "draw" | null;
export type RPSPhase = "choosing" | "revealing" | "result" | "series_over";

export interface RPSRound {
  choices: [RPSChoice, RPSChoice]; // [p1, p2]
  result: RPSRoundResult; // from p1 perspective
}

export interface RPSState {
  phase: RPSPhase;
  rounds: RPSRound[];
  currentChoices: [RPSChoice, RPSChoice];
  scores: [number, number]; // [p1 wins, p2 wins]
  seriesWinner: 0 | 1 | null; // player index
}

// ─── SSE Events ──────────────────────────────────────────────────────────────

export interface SSEEvent {
  type:
    | "room_update"
    | "game_update"
    | "player_joined"
    | "player_disconnected"
    | "rematch_vote"
    | "rematch_start"
    | "error";
  data: Record<string, unknown>;
}
