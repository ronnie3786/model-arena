export function findBestMove(board: ('X' | 'O' | null)[]): number {
  let bestScore = -Infinity
  let bestMove = -1
  
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O'
      const score = minimax(board, 0, false)
      board[i] = null
      
      if (score > bestScore) {
        bestScore = score
        bestMove = i
      }
    }
  }
  
  return bestMove
}

const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function checkWinner(board: ('X' | 'O' | null)[]): 'X' | 'O' | 'draw' | null {
  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  
  if (board.every(cell => cell !== null)) {
    return 'draw'
  }
  
  return null
}

function minimax(board: ('X' | 'O' | null)[], depth: number, isMaximizing: boolean): number {
  const winner = checkWinner(board)
  
  if (winner === 'O') return 10 - depth
  if (winner === 'X') return depth - 10
  if (winner === 'draw') return 0
  
  if (isMaximizing) {
    let bestScore = -Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O'
        const score = minimax(board, depth + 1, false)
        board[i] = null
        bestScore = Math.max(score, bestScore)
      }
    }
    return bestScore
  } else {
    let bestScore = Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X'
        const score = minimax(board, depth + 1, true)
        board[i] = null
        bestScore = Math.min(score, bestScore)
      }
    }
    return bestScore
  }
}

export function getWinningLine(board: ('X' | 'O' | null)[]): number[] | null {
  for (const pattern of winPatterns) {
    const [a, b, c] = pattern
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return pattern
    }
  }
  return null
}
