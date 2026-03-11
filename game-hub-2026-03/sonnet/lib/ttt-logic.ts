import { TTTBoard, TTTCell, TTTWinner } from "@/types";

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

export function checkWinner(board: TTTBoard): { winner: TTTWinner; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

// ─── Minimax AI (unbeatable) ──────────────────────────────────────────────────

function minimax(
  board: TTTBoard,
  isMaximizing: boolean,
  depth: number
): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (winner === "draw") return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const next = [...board] as TTTBoard;
        next[i] = "O";
        best = Math.max(best, minimax(next, false, depth + 1));
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        const next = [...board] as TTTBoard;
        next[i] = "X";
        best = Math.min(best, minimax(next, true, depth + 1));
      }
    }
    return best;
  }
}

export function getBestMove(board: TTTBoard): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      const next = [...board] as TTTBoard;
      next[i] = "O";
      const score = minimax(next, false, 0);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}
