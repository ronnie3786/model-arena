export type Choice = 'rock' | 'paper' | 'scissors'
export type RPSResult = 'win' | 'lose' | 'draw'

export interface RPSRound {
  player1Choice: Choice | null
  player2Choice: Choice | null
  result: RPSResult | null
}

export interface RPSState {
  rounds: RPSRound[]
  currentRound: number
  player1Score: number
  player2Score: number
  player1Name: string
  player2Name: string
  isMultiplayer: boolean
  playerNumber: 1 | 2 | null
  currentChoice: Choice | null
  opponentChoice: Choice | null
  revealPhase: boolean
  countdown: number
  gameComplete: boolean
  seriesWinner: 1 | 2 | null
  rematchRequested: boolean
  opponentRematchRequested: boolean
}

const WINS_AGAINST: Record<Choice, Choice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
}

export function determineWinner(choice1: Choice, choice2: Choice): RPSResult {
  if (choice1 === choice2) return 'draw'
  return WINS_AGAINST[choice1] === choice2 ? 'win' : 'lose'
}

export function getAIChoice(): Choice {
  const choices: Choice[] = ['rock', 'paper', 'scissors']
  return choices[Math.floor(Math.random() * 3)]
}

export function createRPSInitialState(
  player1Name: string = 'Player 1',
  player2Name: string = 'AI',
  isMultiplayer: boolean = false,
  playerNumber: 1 | 2 | null = null
): RPSState {
  return {
    rounds: [{ player1Choice: null, player2Choice: null, result: null }],
    currentRound: 1,
    player1Score: 0,
    player2Score: 0,
    player1Name,
    player2Name,
    isMultiplayer,
    playerNumber,
    currentChoice: null,
    opponentChoice: null,
    revealPhase: false,
    countdown: 3,
    gameComplete: false,
    seriesWinner: null,
    rematchRequested: false,
    opponentRematchRequested: false,
  }
}

export function makeRPSChoice(
  state: RPSState,
  choice: Choice,
  isPlayer1: boolean
): RPSState {
  const newRounds = [...state.rounds]
  const currentRoundIndex = state.currentRound - 1
  
  if (!newRounds[currentRoundIndex]) {
    newRounds[currentRoundIndex] = { player1Choice: null, player2Choice: null, result: null }
  }
  
  if (isPlayer1) {
    newRounds[currentRoundIndex].player1Choice = choice
  } else {
    newRounds[currentRoundIndex].player2Choice = choice
  }
  
  return {
    ...state,
    rounds: newRounds,
    currentChoice: state.playerNumber === 1 && isPlayer1 ? choice : 
                   state.playerNumber === 2 && !isPlayer1 ? choice : state.currentChoice,
  }
}

export function resolveRound(state: RPSState): RPSState {
  const currentRoundIndex = state.currentRound - 1
  const round = state.rounds[currentRoundIndex]
  
  if (!round?.player1Choice || !round?.player2Choice) return state
  
  const result = determineWinner(round.player1Choice, round.player2Choice)
  round.result = result
  
  let newPlayer1Score = state.player1Score
  let newPlayer2Score = state.player2Score
  
  if (result === 'win') newPlayer1Score++
  else if (result === 'lose') newPlayer2Score++
  
  const winThreshold = 3
  const gameComplete = newPlayer1Score >= winThreshold || newPlayer2Score >= winThreshold
  const seriesWinner = newPlayer1Score >= winThreshold ? 1 : 
                       newPlayer2Score >= winThreshold ? 2 : null
  
  return {
    ...state,
    rounds: [...state.rounds],
    player1Score: newPlayer1Score,
    player2Score: newPlayer2Score,
    gameComplete,
    seriesWinner,
  }
}

export function nextRound(state: RPSState): RPSState {
  return {
    ...state,
    rounds: [...state.rounds, { player1Choice: null, player2Choice: null, result: null }],
    currentRound: state.currentRound + 1,
    currentChoice: null,
    opponentChoice: null,
    revealPhase: false,
    countdown: 3,
  }
}

export function resetRPSSeries(state: RPSState): RPSState {
  return {
    ...createRPSInitialState(state.player1Name, state.player2Name, state.isMultiplayer, state.playerNumber),
    rematchRequested: false,
    opponentRematchRequested: false,
  }
}
