import { RPSChoice, RoomState, TTTBoard, TTTState } from "@/lib/types";

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createInitialTTT(): TTTState {
  return {
    board: Array<TTTBoard[number]>(9).fill(null),
    currentTurn: "X",
    winner: null,
    winningLine: null,
    draw: false,
    score: { X: 0, O: 0, draws: 0 },
  };
}

export function createInitialRPS(playerIds: string[]) {
  return {
    choices: Object.fromEntries(playerIds.map((id) => [id, null])),
    revealedChoices: Object.fromEntries(playerIds.map((id) => [id, null])),
    roundWinner: null,
    roundResultText: null,
    score: { player1: 0, player2: 0, draws: 0, round: 1, seriesWinner: null },
    countdown: null,
    revealPhase: false,
  };
}

export function evaluateBoard(board: TTTBoard) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) {
    return { winner: null, line: null, draw: true };
  }
  return { winner: null, line: null, draw: false };
}

function minimax(board: TTTBoard, depth: number, isMaximizing: boolean): number {
  const result = evaluateBoard(board);
  if (result.winner === "O") return 10 - depth;
  if (result.winner === "X") return depth - 10;
  if (result.draw) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] === null) {
        board[i] = "O";
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = null;
      }
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) {
      board[i] = "X";
      best = Math.min(best, minimax(board, depth + 1, true));
      board[i] = null;
    }
  }
  return best;
}

export function getBestAIMove(board: TTTBoard): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === null) {
      board[i] = "O";
      const score = minimax(board, 0, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export function applyTTTMove(room: RoomState, index: number) {
  const ttt = room.ttt!;
  if (ttt.board[index] || ttt.winner || ttt.draw) return room;
  ttt.board[index] = ttt.currentTurn;
  const result = evaluateBoard(ttt.board);
  if (result.winner) {
    ttt.winner = result.winner;
    ttt.winningLine = result.line as number[];
    ttt.score[result.winner] += 1;
  } else if (result.draw) {
    ttt.draw = true;
    ttt.score.draws += 1;
  } else {
    ttt.currentTurn = ttt.currentTurn === "X" ? "O" : "X";
  }
  return room;
}

export function resetTTTRound(room: RoomState) {
  const currentScore = room.ttt?.score ?? { X: 0, O: 0, draws: 0 };
  room.ttt = {
    ...createInitialTTT(),
    score: currentScore,
  };
  return room;
}

export function determineRPSWinner(a: RPSChoice, b: RPSChoice): 0 | 1 | -1 {
  if (a === b) return 0;
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return 1;
  }
  return -1;
}
