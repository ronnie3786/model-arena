import { Room, GameType, TTTState, RPSState } from "@/types";

// ─── In-memory store ──────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
// SSE subscriber map: roomId -> Set of response controllers
const subscribers = new Map<string, Set<ReadableStreamDefaultController>>();

const ROOM_TTL = 2 * 60 * 1000; // 2 minutes for waiting rooms
const ROOM_GAME_TTL = 30 * 60 * 1000; // 30 minutes for active games

// Cleanup expired rooms every minute
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (room.expiresAt < now) {
        rooms.delete(id);
        subscribers.delete(id);
      }
    }
  };
  // Only run in Node environment
  if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 60_000);
  }
}

// ─── Code generation ──────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// ─── Initial game states ──────────────────────────────────────────────────────

function initialTTTState(): TTTState {
  return {
    board: Array(9).fill(null),
    currentTurn: "X",
    winner: null,
    winLine: null,
    scores: { X: 0, O: 0, draws: 0 },
  };
}

function initialRPSState(): RPSState {
  return {
    phase: "choosing",
    rounds: [],
    currentChoices: [null, null],
    scores: [0, 0],
    seriesWinner: null,
  };
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export function createRoom(gameType: GameType, hostName: string): Room {
  let code = generateCode();
  // Ensure unique code
  while ([...rooms.values()].some((r) => r.code === code)) {
    code = generateCode();
  }

  const id = generateId();
  const room: Room = {
    id,
    code,
    gameType,
    status: "waiting",
    players: [
      { id: generateId(), name: hostName, connected: true },
      null,
    ],
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_TTL,
    gameState: null,
    rematchVotes: [],
  };

  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function getRoomByCode(code: string): Room | undefined {
  return [...rooms.values()].find((r) => r.code === code.toUpperCase());
}

export function joinRoom(
  roomId: string,
  guestName: string
): { room: Room; playerId: string } | { error: string } {
  const room = rooms.get(roomId);
  if (!room) return { error: "Room not found" };
  if (room.status !== "waiting") return { error: "Game already started" };
  if (room.players[1]) return { error: "Room is full" };
  if (Date.now() > room.expiresAt) return { error: "Room has expired" };

  const playerId = generateId();
  room.players[1] = { id: playerId, name: guestName, connected: true };
  room.status = "playing";
  room.expiresAt = Date.now() + ROOM_GAME_TTL;
  room.gameState =
    room.gameType === "ttt" ? initialTTTState() : initialRPSState();

  rooms.set(roomId, room);
  broadcast(roomId, { type: "player_joined", data: { room: serializeRoom(room) } });
  return { room, playerId };
}

export function updateRoom(room: Room): void {
  rooms.set(room.id, room);
}

export function serializeRoom(room: Room): Record<string, unknown> {
  return {
    id: room.id,
    code: room.code,
    gameType: room.gameType,
    status: room.status,
    players: room.players,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    gameState: room.gameState,
    rematchVotes: room.rematchVotes,
  };
}

// ─── SSE Pub/Sub ──────────────────────────────────────────────────────────────

export function subscribe(
  roomId: string,
  controller: ReadableStreamDefaultController
): () => void {
  if (!subscribers.has(roomId)) {
    subscribers.set(roomId, new Set());
  }
  subscribers.get(roomId)!.add(controller);

  return () => {
    subscribers.get(roomId)?.delete(controller);
  };
}

export function broadcast(
  roomId: string,
  event: { type: string; data: Record<string, unknown> }
): void {
  const subs = subscribers.get(roomId);
  if (!subs) return;

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(payload);

  for (const controller of subs) {
    try {
      controller.enqueue(bytes);
    } catch {
      // Controller closed; remove it
      subs.delete(controller);
    }
  }
}

export function markDisconnected(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (let i = 0; i < 2; i++) {
    if (room.players[i]?.id === playerId) {
      room.players[i]!.connected = false;
    }
  }
  rooms.set(roomId, room);
  broadcast(roomId, {
    type: "player_disconnected",
    data: { playerId, room: serializeRoom(room) },
  });
}

export function markConnected(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  for (let i = 0; i < 2; i++) {
    if (room.players[i]?.id === playerId) {
      room.players[i]!.connected = true;
    }
  }
  rooms.set(roomId, room);
}
