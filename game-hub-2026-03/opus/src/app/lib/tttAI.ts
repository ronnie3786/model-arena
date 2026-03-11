// Minimax AI for Tic-Tac-Toe - unbeatable
// Note: minimax mutates the board array internally for performance but restores it.
// Always pass a copy of the board to getBestMove.

type Cell = 'X' | 'O' | null;
type Board = Cell[];

function checkWinner(board: Board): Cell | 'draw' | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(c => c !== null)) return 'draw';
  return null;
}

function minimax(board: Board, isMaximizing: boolean, alpha: number, beta: number): number {
  const result = checkWinner(board);
  if (result === 'O') return 10; // AI wins
  if (result === 'X') return -10; // Player wins
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

/**
 * Returns the best move index for the AI (O).
 * IMPORTANT: This function mutates the board internally then restores it.
 * Always pass a copy of the board, not the original state.
 */
export function getBestMove(board: Board): number {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O';
      const score = minimax(board, false, -Infinity, Infinity);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  return bestMove;
}
