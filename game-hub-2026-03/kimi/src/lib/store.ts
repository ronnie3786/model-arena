import { Room, GameType, PlayerInfo, TicTacToeState, RPSState } from '@/types';

class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private playerToRoom: Map<string, string> = new Map();
  private listeners: Map<string, Set<(event: unknown) => void>> = new Map();

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createRoom(gameType: GameType, hostName: string): Room {
    const code = this.generateCode();
    const id = this.generateId();
    const now = Date.now();

    const host: PlayerInfo = {
      id: this.generateId(),
      name: hostName,
      symbol: gameType === 'tic-tac-toe' ? 'X' : undefined,
      isConnected: true,
      lastPing: now,
    };

    let gameState: TicTacToeState | RPSState;

    if (gameType === 'tic-tac-toe') {
      gameState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        winningLine: null,
        scores: { X: 0, O: 0, draws: 0 },
      };
    } else {
      gameState = {
        player1Choice: null,
        player2Choice: null,
        player1Score: 0,
        player2Score: 0,
        roundResult: null,
        roundComplete: false,
        seriesWinner: null,
        rematchRequested: null,
      };
    }

    const room: Room = {
      id,
      code,
      gameType,
      status: 'waiting',
      players: [host],
      createdAt: now,
      expiresAt: now + 2 * 60 * 1000, // 2 minutes
      gameState,
      spectators: [],
    };

    this.rooms.set(id, room);
    this.playerToRoom.set(host.id, id);
    this.listeners.set(id, new Set());

    return room;
  }

  joinRoom(code: string, playerName: string): Room | null {
    const room = this.getRoomByCode(code);
    if (!room || room.players.length >= 2 || room.status !== 'waiting') {
      return null;
    }

    const player: PlayerInfo = {
      id: this.generateId(),
      name: playerName,
      symbol: room.gameType === 'tic-tac-toe' ? 'O' : undefined,
      isConnected: true,
      lastPing: Date.now(),
    };

    room.players.push(player);
    room.status = 'playing';
    this.playerToRoom.set(player.id, room.id);

    this.notify(room.id, {
      type: 'playerJoined',
      data: { player },
      timestamp: Date.now(),
    });

    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find(r => r.code === code);
  }

  getRoomByPlayerId(playerId: string): Room | undefined {
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  updateRoom(id: string, updates: Partial<Room>): Room | undefined {
    const room = this.rooms.get(id);
    if (!room) return undefined;

    Object.assign(room, updates);
    this.notify(id, {
      type: 'gameUpdate',
      data: { room },
      timestamp: Date.now(),
    });

    return room;
  }

  updateGameState(id: string, gameState: TicTacToeState | RPSState): Room | undefined {
    const room = this.rooms.get(id);
    if (!room) return undefined;

    room.gameState = gameState;
    this.notify(id, {
      type: 'gameUpdate',
      data: { room },
      timestamp: Date.now(),
    });

    return room;
  }

  pingPlayer(playerId: string): boolean {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room) return false;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.lastPing = Date.now();
      player.isConnected = true;
      return true;
    }
    return false;
  }

  disconnectPlayer(playerId: string): void {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isConnected = false;
      this.notify(roomId, {
        type: 'opponentDisconnected',
        data: { playerId },
        timestamp: Date.now(),
      });
    }
  }

  deleteRoom(id: string): void {
    const room = this.rooms.get(id);
    if (room) {
      room.players.forEach(p => this.playerToRoom.delete(p.id));
      this.listeners.delete(id);
      this.rooms.delete(id);
    }
  }

  subscribe(roomId: string, callback: (event: unknown) => void): () => void {
    if (!this.listeners.has(roomId)) {
      this.listeners.set(roomId, new Set());
    }
    this.listeners.get(roomId)!.add(callback);

    return () => {
      this.listeners.get(roomId)?.delete(callback);
    };
  }

  private notify(roomId: string, event: unknown): void {
    this.listeners.get(roomId)?.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('Error notifying listener:', e);
      }
    });
  }

  cleanupExpiredRooms(): void {
    const now = Date.now();
    Array.from(this.rooms.values()).forEach(room => {
      if (room.expiresAt < now && room.status === 'waiting') {
        this.notify(room.id, {
          type: 'roomExpired',
          data: { roomId: room.id },
          timestamp: now,
        });
        this.deleteRoom(room.id);
      }
    });
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }
}

export const roomStore = new RoomStore();

setInterval(() => {
  roomStore.cleanupExpiredRooms();
}, 30000);
