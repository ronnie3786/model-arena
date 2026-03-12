import { nanoid } from 'nanoid';

// --- Shared Types ---

export type GameType = 'tic-tac-toe' | 'rock-paper-scissors';

export type Player = {
  id: string;
  name: string;
  connected: boolean;
};

export type GameState = 'waiting' | 'playing' | 'finished';

// Tic Tac Toe
export type TTTBoard = (string | null)[]; // 'X', 'O', null
export type TTTSymbol = 'X' | 'O';
export interface TTTData {
  board: TTTBoard;
  turn: string; // player id
  winner: string | 'draw' | null;
  scores: Record<string, number>; // player id -> score
  winningLine: number[] | null;
}

// Rock Paper Scissors
export type RPSChoice = 'rock' | 'paper' | 'scissors' | null;
export interface RPSPlayerData {
  choice: RPSChoice;
  score: number;
}
export interface RPSData {
  players: Record<string, RPSPlayerData>; // player id -> data
  winner: string | 'draw' | null;
  round: number;
  maxRounds: number;
}

export interface Room {
  id: string; // 6 char code
  gameType: GameType;
  players: Player[];
  state: GameState;
  createdAt: number;
  gameData: TTTData | RPSData | any;
}

// --- Server-side Store (In-memory) ---
// Note: This relies on the server staying alive and running in a single process.
// In a serverless environment (like Vercel default API routes), this might reset between requests
// if the cold start happens or if scaled across multiple instances. 
// For this prototype, we'll keep it simple in memory.
export const rooms = new Map<string, Room>();

const ROOM_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// Cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Array.from(rooms.entries()).forEach(([id, room]) => {
      // If room is waiting and older than 2 mins, delete
      if (room.state === 'waiting' && (now - room.createdAt > ROOM_TIMEOUT_MS)) {
        rooms.delete(id);
      }
    });
  }, 60000); // Check every minute
}

export function generateRoomCode(): string {
  const code = nanoid(6).toUpperCase();
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

export function createRoom(gameType: GameType, playerName: string, playerId: string): Room {
  const id = generateRoomCode();
  let initialGameData: any = {};

  if (gameType === 'tic-tac-toe') {
    initialGameData = {
      board: Array(9).fill(null),
      turn: playerId,
      winner: null,
      scores: { [playerId]: 0 },
      winningLine: null
    } as TTTData;
  } else if (gameType === 'rock-paper-scissors') {
    initialGameData = {
      players: { [playerId]: { choice: null, score: 0 } },
      winner: null,
      round: 1,
      maxRounds: 5
    } as RPSData;
  }

  const room: Room = {
    id,
    gameType,
    players: [{ id: playerId, name: playerName, connected: true }],
    state: 'waiting',
    createdAt: Date.now(),
    gameData: initialGameData,
  };

  rooms.set(id, room);
  return room;
}

export function joinRoom(roomId: string, playerName: string, playerId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Re-join logic if player already exists
  const existingPlayerIndex = room.players.findIndex(p => p.id === playerId);
  if (existingPlayerIndex !== -1) {
    room.players[existingPlayerIndex].connected = true;
    return room;
  }

  if (room.players.length >= 2) return null; // Room full

  room.players.push({ id: playerId, name: playerName, connected: true });
  room.state = 'playing';

  // Initialize game data for player 2
  if (room.gameType === 'tic-tac-toe') {
    (room.gameData as TTTData).scores[playerId] = 0;
  } else if (room.gameType === 'rock-paper-scissors') {
     (room.gameData as RPSData).players[playerId] = { choice: null, score: 0 };
  }

  return room;
}
