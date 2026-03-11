import { Room, Player, GameType, GameMode, TicTacToeState, RPSState } from './types'

const rooms = new Map<string, {
  room: Room
  gameStates: Map<string, TicTacToeState | RPSState>
  clients: Set<any>
  rematchReady: Set<string>
}>()

const ROOM_EXPIRY_MS = 2 * 60 * 1000

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function cleanupExpiredRooms() {
  const now = Date.now()
  const expiredRooms: string[] = []
  
  rooms.forEach((data, id) => {
    if (data.room.expiresAt < now && data.room.status === 'waiting') {
      expiredRooms.push(id)
    }
  })
  
  expiredRooms.forEach(id => rooms.delete(id))
}

setInterval(cleanupExpiredRooms, 10000)

export function createRoom(gameType: GameType, mode: GameMode, player1: Player): Room {
  const id = generateRoomCode()
  const now = Date.now()
  
  const room: Room = {
    id,
    gameType,
    mode,
    players: [player1],
    createdAt: now,
    expiresAt: now + ROOM_EXPIRY_MS,
    status: 'waiting',
  }
  
  rooms.set(id, {
    room,
    gameStates: new Map(),
    clients: new Set(),
    rematchReady: new Set(),
  })
  
  return room
}

export function getRoom(id: string): Room | null {
  const data = rooms.get(id)
  if (!data) return null
  if (data.room.expiresAt < Date.now() && data.room.status === 'waiting') {
    rooms.delete(id)
    return null
  }
  return data.room
}

export function joinRoom(id: string, player: Player): { success: boolean; room?: Room; error?: string } {
  const data = rooms.get(id)
  if (!data) {
    return { success: false, error: 'Room not found' }
  }
  
  if (data.room.status === 'playing') {
    return { success: false, error: 'Game already in progress' }
  }
  
  if (data.room.players.length >= 2) {
    return { success: false, error: 'Room is full' }
  }
  
  data.room.players.push(player)
  data.room.status = 'playing'
  
  if (data.room.gameType === 'tic-tac-toe') {
    const initialState: TicTacToeState = {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null,
      winningLine: null,
      scores: { X: 0, O: 0, draws: 0 },
    }
    data.gameStates.set('tictactoe', initialState)
  } else {
    const initialState: RPSState = {
      player1Score: 0,
      player2Score: 0,
      rounds: [],
      currentRound: 1,
      winner: null,
      player1Choice: null,
      player2Choice: null,
      bothChosen: false,
    }
    data.gameStates.set('rps', initialState)
  }
  
  return { success: true, room: data.room }
}

export function updateGameState(id: string, gameType: 'tictactoe' | 'rps', state: TicTacToeState | RPSState): void {
  const data = rooms.get(id)
  if (data) {
    data.gameStates.set(gameType, state)
  }
}

export function getGameState(id: string, gameType: 'tictactoe' | 'rps'): TicTacToeState | RPSState | null {
  const data = rooms.get(id)
  if (!data) return null
  return data.gameStates.get(gameType) || null
}

export function broadcastToRoom(id: string, message: any, excludeClient?: any): void {
  const data = rooms.get(id)
  if (!data) return
  
  const messageStr = JSON.stringify(message)
  const clientsArray = Array.from(data.clients)
  for (const client of clientsArray) {
    if (client !== excludeClient && client.readyState === 1) {
      client.send(`data: ${messageStr}\n\n`)
    }
  }
}

export function addClient(id: string, client: any): void {
  const data = rooms.get(id)
  if (data) {
    data.clients.add(client)
  }
}

export function removeClient(id: string, client: any): void {
  const data = rooms.get(id)
  if (data) {
    data.clients.delete(client)
  }
}

export function getPlayerCount(id: string): number {
  const data = rooms.get(id)
  if (!data) return 0
  return data.room.players.length
}

export function markRematchReady(id: string, playerId: string): boolean {
  const data = rooms.get(id)
  if (!data) return false
  
  data.rematchReady.add(playerId)
  
  if (data.rematchReady.size >= 2) {
    data.rematchReady.clear()
    
    if (data.room.gameType === 'tic-tac-toe') {
      const state: TicTacToeState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        scores: (data.gameStates.get('tictactoe') as TicTacToeState)?.scores || { X: 0, O: 0, draws: 0 },
      }
      data.gameStates.set('tictactoe', state)
    } else {
      const state: RPSState = {
        player1Score: 0,
        player2Score: 0,
        rounds: [],
        currentRound: 1,
        winner: null,
        player1Choice: null,
        player2Choice: null,
        bothChosen: false,
      }
      data.gameStates.set('rps', state)
    }
    
    return true
  }
  
  return false
}

export function deleteRoom(id: string): void {
  rooms.delete(id)
}
