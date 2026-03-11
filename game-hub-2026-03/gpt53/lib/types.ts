export type GameKind = "ttt" | "rps";

export type Choice = "rock" | "paper" | "scissors";

export interface PlayerState {
  id: string;
  name: string;
  connected: boolean;
  rematchAccepted: boolean;
}

export interface TttState {
  board: Array<"X" | "O" | null>;
  turn: "X" | "O";
  winner: "X" | "O" | "draw" | null;
  winningLine: number[] | null;
  scores: {
    player1: number;
    player2: number;
    draws: number;
  };
}

export interface RpsState {
  round: number;
  bestOf: number;
  wins: Record<string, number>;
  choices: Record<string, Choice | null>;
  bothChosen: boolean;
  roundWinner: string | "draw" | null;
  seriesWinner: string | "draw" | null;
}

export interface RoomSnapshot {
  code: string;
  game: GameKind;
  status: "waiting" | "active" | "expired";
  expiresAt: number;
  players: PlayerState[];
  ttt?: TttState;
  rps?: RpsState;
}

export type RoomAction =
  | { type: "ttt_move"; index: number }
  | { type: "ttt_next_round" }
  | { type: "rps_pick"; choice: Choice }
  | { type: "rps_next_round" }
  | { type: "rematch" }
  | { type: "heartbeat" };
