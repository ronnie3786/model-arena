export type GameType = "tictactoe" | "rps";
export type RoomMode = "ai" | "friend";

export type Player = {
  id: string;
  name: string;
  connected: boolean;
};

export type TTTCell = "X" | "O" | null;
export type TTTBoard = TTTCell[];
export type TTTScore = {
  X: number;
  O: number;
  draws: number;
};

export type TTTState = {
  board: TTTBoard;
  currentTurn: "X" | "O";
  winner: "X" | "O" | null;
  winningLine: number[] | null;
  draw: boolean;
  score: TTTScore;
};

export type RPSChoice = "rock" | "paper" | "scissors";
export type RPSRoundResult = "win" | "lose" | "draw" | null;
export type RPSScore = {
  player1: number;
  player2: number;
  draws: number;
  round: number;
  seriesWinner: string | null;
};

export type RPSState = {
  choices: Record<string, RPSChoice | null>;
  revealedChoices: Record<string, RPSChoice | null>;
  roundWinner: string | null;
  roundResultText: string | null;
  score: RPSScore;
  countdown: number | null;
  revealPhase: boolean;
};

export type RoomState = {
  code: string;
  game: GameType;
  mode: RoomMode;
  createdAt: number;
  expiresAt: number;
  started: boolean;
  hostId: string;
  players: Player[];
  spectators: number;
  rematchVotes: string[];
  lastEventAt: number;
  statusMessage: string | null;
  ttt?: TTTState;
  rps?: RPSState;
};

export type RoomEvent = {
  type: string;
  room: RoomState;
};
