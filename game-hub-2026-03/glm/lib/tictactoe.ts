export type Player = 'X' | 'O'
export type Cell = Player | null
export type Board = Cell[]
export type GameResult = 'X' | 'O' | 'draw' | null

export interface TicTacToeState {
  board: Board
  currentTurn: Player
  winner: GameResult
  winningLine: number[] | null
  scores: { X: number; O: number; draws: number }
  players: { X: string; O: string }
  isMultiplayer: boolean
  playerMark: Player | null
  rematchRequested: boolean
  opponentRematchRequested: boolean
}

export const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function checkWinner(board: Board): { winner: GameResult; line: number[] | null } {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line: combo }
    }
  }
  
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null }
  }
  
  return { winner: null, line: null }
}

export function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number
): number {
  const { winner } = checkWinner(board)
  
  if (winner === 'O') return 10 - depth
  if (winner === 'X') return depth - 10
  if (winner === 'draw') return 0
  
  if (isMaximizing) {
    let maxEval = -Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O'
        const evaluation = minimax(board, depth + 1, false, alpha, beta)
        board[i] = null
        maxEval = Math.max(maxEval, evaluation)
        alpha = Math.max(alpha, evaluation)
        if (beta <= alpha) break
      }
    }
    return maxEval
  } else {
    let minEval = Infinity
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X'
        const evaluation = minimax(board, depth + 1, true, alpha, beta)
        board[i] = null
        minEval = Math.min(minEval, evaluation)
        beta = Math.min(beta, evaluation)
        if (beta <= alpha) break
      }
    }
    return minEval
  }
}

export function getBestMove(board: Board): number {
  let bestMove = -1
  let bestValue = -Infinity
  
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O'
      const moveValue = minimax(board, 0, false, -Infinity, Infinity)
      board[i] = null
      
      if (moveValue > bestValue) {
        bestValue = moveValue
        bestMove = i
      }
    }
  }
  
  return bestMove
}

export function createInitialState(players?: { X: string; O: string }, playerMark?: Player): TicTacToeState {
  return {
    board: Array(9).fill(null),
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    scores: { X: 0, O: 0, draws: 0 },
    players: players || { X: 'Player 1', O: 'Player 2' },
    isMultiplayer: !!players,
    playerMark: playerMark || null,
    rematchRequested: false,
    opponentRematchRequested: false,
  }
}

export function makeMove(state: TicTacToeState, index: number, playerName?: string): TicTacToeState {
  if (state.board[index] || state.winner) return state
  
  const newBoard = [...state.board]
  newBoard[index] = state.currentTurn
  
  const { winner, line } = checkWinner(newBoard)
  
  const newScores = { ...state.scores }
  if (winner && winner !== 'draw') {
    newScores[winner as Player]++
  } else if (winner === 'draw') {
    newScores.draws++
  }
  
  return {
    ...state,
    board: newBoard,
    currentTurn: state.currentTurn === 'X' ? 'O' : 'X',
    winner,
    winningLine: line,
    scores: newScores,
  }
}

export function resetGame(state: TicTacToeState): TicTacToeState {
  return {
    ...state,
    board: Array(9).fill(null),
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    rematchRequested: false,
    opponentRematchRequested: false,
  }
}
