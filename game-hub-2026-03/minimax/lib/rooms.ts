import { Room, GameState } from '@/types';

const globalRooms = globalThis as unknown as { __rooms?: Map<string, Room>; __clients?: Map<string, Set<(data: Room) => void>> };
const rooms = globalRooms.__rooms ?? new Map<string, Room>();
const clients = globalRooms.__clients ?? new Map<string, Set<(data: Room) => void>>();
if (!globalRooms.__rooms) globalRooms.__rooms = rooms;
if (!globalRooms.__clients) globalRooms.__clients = clients;

export function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createRoom(game: 'tictactoe' | 'rockpaperscissors'): Room {
  const code = generateCode();
  const now = Date.now();
  
  const initialState: GameState = game === 'tictactoe' 
    ? { status: 'waiting' }
    : { status: 'waiting' };

  const room: Room = {
    code,
    game,
    player1: null,
    player2: null,
    state: initialState,
    createdAt: now,
    expiresAt: now + 2 * 60 * 1000,
    scores: { player1: 0, player2: 0, draws: 0 },
    currentRound: 1,
    rematchRequests: [],
  };
  
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  const room = rooms.get(code.toUpperCase());
  if (room && Date.now() > room.expiresAt) {
    rooms.delete(code.toUpperCase());
    return undefined;
  }
  return room;
}

export function updateRoom(code: string, updates: Partial<Room>): Room | undefined {
  const room = rooms.get(code.toUpperCase());
  if (!room) return undefined;
  
  const updated = { ...room, ...updates };
  rooms.set(code.toUpperCase(), updated);
  
  notifyClients(code.toUpperCase(), updated);
  return updated;
}

export function addClient(code: string, callback: (data: Room) => void): () => void {
  const upperCode = code.toUpperCase();
  if (!clients.has(upperCode)) {
    clients.set(upperCode, new Set());
  }
  clients.get(upperCode)!.add(callback);
  
  return () => {
    const clientSet = clients.get(upperCode);
    if (clientSet) {
      clientSet.delete(callback);
      if (clientSet.size === 0) {
        clients.delete(upperCode);
      }
    }
  };
}

function notifyClients(code: string, room: Room): void {
  const clientSet = clients.get(code.toUpperCase());
  if (clientSet) {
    clientSet.forEach(callback => callback(room));
  }
}

export function deleteRoom(code: string): void {
  rooms.delete(code.toUpperCase());
  clients.delete(code.toUpperCase());
}
