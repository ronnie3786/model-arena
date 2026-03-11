export interface Room {
  code: string
  game: 'tictactoe' | 'rps'
  players: { id: string; name: string; mark?: 'X' | 'O'; playerNumber?: 1 | 2 }[]
  state: unknown
  createdAt: number
  expiresAt: number
  rematchVotes: string[]
}

class RoomStore {
  private rooms: Map<string, Room> = new Map()
  private clients: Map<string, Set<ReadableStreamDefaultController>> = new Map()

  listRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  createRoom(code: string, game: 'tictactoe' | 'rps', playerId: string, playerName: string): Room {
    const now = Date.now()
    const room: Room = {
      code,
      game,
      players: [{
        id: playerId,
        name: playerName,
        mark: game === 'tictactoe' ? 'X' : undefined,
        playerNumber: game === 'rps' ? 1 : undefined,
      }],
      state: null,
      createdAt: now,
      expiresAt: now + 2 * 60 * 1000,
      rematchVotes: [],
    }
    this.rooms.set(code, room)
    return room
  }
  
  getRoom(code: string): Room | undefined {
    return this.rooms.get(code)
  }
  
  joinRoom(code: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(code)
    if (!room || room.players.length >= 2) return null
    
    room.players.push({
      id: playerId,
      name: playerName,
      mark: room.game === 'tictactoe' ? 'O' : undefined,
      playerNumber: room.game === 'rps' ? 2 : undefined,
    })
    
    return room
  }
  
  updateRoom(code: string, updates: Partial<Room>): Room | undefined {
    const room = this.rooms.get(code)
    if (!room) return undefined
    
    Object.assign(room, updates)
    return room
  }
  
  deleteRoom(code: string): void {
    this.rooms.delete(code)
    this.clients.delete(code)
  }
  
  addClient(code: string, controller: ReadableStreamDefaultController): void {
    if (!this.clients.has(code)) {
      this.clients.set(code, new Set())
    }
    this.clients.get(code)!.add(controller)
  }
  
  removeClient(code: string, controller: ReadableStreamDefaultController): void {
    this.clients.get(code)?.delete(controller)
  }
  
  broadcast(code: string, data: unknown): void {
    const clients = this.clients.get(code)
    if (!clients) return
    
    const message = `data: ${JSON.stringify(data)}\n\n`
    clients.forEach(client => {
      try {
        client.enqueue(message)
      } catch {
        clients.delete(client)
      }
    })
  }
  
  generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code: string
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    } while (this.rooms.has(code))
    return code
  }
  
  cleanupExpired(): void {
    const now = Date.now()
    this.rooms.forEach((room, code) => {
      if (room.expiresAt < now) {
        this.deleteRoom(code)
      }
    })
  }
}

const globalForRooms = globalThis as unknown as {
  roomStore: RoomStore | undefined
}

export const roomStore = globalForRooms.roomStore ?? new RoomStore()

if (process.env.NODE_ENV !== 'production') {
  globalForRooms.roomStore = roomStore
}

setInterval(() => roomStore.cleanupExpired(), 30000)
