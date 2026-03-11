export type GameType = 'tic-tac-toe' | 'rock-paper-scissors'
export type GameMode = 'ai' | 'multiplayer'

export interface Player {
  id: string
  name: string
  symbol?: 'X' | 'O'
}

export interface Room {
  id: string
  gameType: GameType
  mode: GameMode
  players: Player[]
  createdAt: number
  expiresAt: number
  status: 'waiting' | 'playing' | 'finished'
}

export interface TicTacToeState {
  board: ('X' | 'O' | null)[]
  currentPlayer: 'X' | 'O'
  winner: 'X' | 'O' | 'draw' | null
  winningLine: number[] | null
  scores: { X: number; O: number; draws: number }
}

export type RPSChoice = 'rock' | 'paper' | 'scissors'

export interface RPSRoundResult {
  player1Choice: RPSChoice
  player2Choice: RPSChoice
  winner: 'player1' | 'player2' | 'draw'
}

export interface RPSState {
  player1Score: number
  player2Score: number
  rounds: RPSRoundResult[]
  currentRound: number
  winner: 'player1' | 'player2' | null
  player1Choice: RPSChoice | null
  player2Choice: RPSChoice | null
  bothChosen: boolean
}

export interface GameMessage {
  type: 'join' | 'move' | 'rematch' | 'chat' | 'disconnect'
  payload: any
}

export interface ServerMessage {
  type: 'player-joined' | 'game-start' | 'game-state' | 'player-left' | 'rematch-request' | 'rematch-accepted'
  payload: any
}
