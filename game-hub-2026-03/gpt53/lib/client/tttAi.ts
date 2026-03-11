type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function checkWinner(board: Cell[]): "X" | "O" | "draw" | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function minimax(board: Cell[], isMax: boolean): number {
  const result = checkWinner(board);
  if (result === "O") return 10;
  if (result === "X") return -10;
  if (result === "draw") return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i += 1) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < 9; i += 1) {
    if (!board[i]) {
      board[i] = "X";
      best = Math.min(best, minimax(board, true));
      board[i] = null;
    }
  }
  return best;
}

export function bestMove(board: Cell[]): number {
  let bestScore = -Infinity;
  let move = -1;
  for (let i = 0; i < 9; i += 1) {
    if (!board[i]) {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export function evaluateBoard(board: Cell[]): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}
