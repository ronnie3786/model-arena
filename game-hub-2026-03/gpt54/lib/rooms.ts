import { createInitialRPS, createInitialTTT, determineRPSWinner, resetTTTRound } from "@/lib/game-logic";
import { GameType, Player, RPSChoice, RoomEvent, RoomState } from "@/lib/types";

type Listener = (event: RoomEvent) => void;

declare global {
  var __gameRooms: Map<string, RoomState> | undefined;
  var __roomListeners: Map<string, Set<Listener>> | undefined;
}

const rooms = globalThis.__gameRooms ?? new Map<string, RoomState>();
const listeners = globalThis.__roomListeners ?? new Map<string, Set<Listener>>();

globalThis.__gameRooms = rooms;
globalThis.__roomListeners = listeners;

const ROOM_TTL_MS = 2 * 60 * 1000;

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function makePlayer(name: string): Player {
  return {
    id: crypto.randomUUID(),
    name,
    connected: true,
  };
}

export function createRoom(game: GameType, name: string) {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();
  const host = makePlayer(name);
  const room: RoomState = {
    code,
    game,
    mode: "friend",
    createdAt: Date.now(),
    expiresAt: Date.now() + ROOM_TTL_MS,
    started: false,
    hostId: host.id,
    players: [host],
    spectators: 0,
    rematchVotes: [],
    lastEventAt: Date.now(),
    statusMessage: null,
    ttt: game === "tictactoe" ? createInitialTTT() : undefined,
    rps: game === "rps" ? createInitialRPS([host.id]) : undefined,
  };
  rooms.set(code, room);
  emit(code, "room_created");
  return room;
}

export function getRoom(code: string) {
  cleanupExpired();
  return rooms.get(code.toUpperCase()) ?? null;
}

export function joinRoom(code: string, name: string) {
  const room = getRoom(code);
  if (!room) return null;
  if (room.players.length >= 2) return room;
  const player = makePlayer(name);
  room.players.push(player);
  room.started = true;
  room.expiresAt = Date.now() + 30 * 60 * 1000;
  room.statusMessage = null;
  if (room.game === "rps") {
    room.rps = createInitialRPS(room.players.map((entry) => entry.id));
  }
  emit(room.code, "player_joined");
  return room;
}

export function updateConnection(code: string, playerId: string, connected: boolean) {
  const room = getRoom(code);
  if (!room) return null;
  const player = room.players.find((entry) => entry.id === playerId);
  if (!player) return room;
  player.connected = connected;
  room.statusMessage = connected ? null : "Opponent disconnected";
  emit(room.code, connected ? "player_connected" : "player_disconnected");
  return room;
}

export function leaveRoom(code: string, playerId: string) {
  const room = getRoom(code);
  if (!room) return null;
  updateConnection(code, playerId, false);
  return room;
}

export function subscribe(code: string, listener: Listener) {
  const roomCode = code.toUpperCase();
  if (!listeners.has(roomCode)) listeners.set(roomCode, new Set());
  listeners.get(roomCode)!.add(listener);
  return () => listeners.get(roomCode)?.delete(listener);
}

export function emit(code: string, type: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) return;
  room.lastEventAt = Date.now();
  const event = { type, room: structuredClone(room) };
  listeners.get(code.toUpperCase())?.forEach((listener) => listener(event));
}

export function makeAITTTState(name: string) {
  return {
    code: `AI-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    game: "tictactoe" as const,
    mode: "ai" as const,
    createdAt: Date.now(),
    expiresAt: Date.now(),
    started: true,
    hostId: "human",
    players: [
      { id: "human", name, connected: true },
      { id: "ai", name: "Unbeatable AI", connected: true },
    ],
    spectators: 0,
    rematchVotes: [],
    lastEventAt: Date.now(),
    statusMessage: null,
    ttt: createInitialTTT(),
  } satisfies RoomState;
}

export function makeAIRPSState(name: string) {
  return {
    code: `AI-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
    game: "rps" as const,
    mode: "ai" as const,
    createdAt: Date.now(),
    expiresAt: Date.now(),
    started: true,
    hostId: "human",
    players: [
      { id: "human", name, connected: true },
      { id: "ai", name: "Chaos CPU", connected: true },
    ],
    spectators: 0,
    rematchVotes: [],
    lastEventAt: Date.now(),
    statusMessage: null,
    rps: createInitialRPS(["human", "ai"]),
  } satisfies RoomState;
}

export function playRPS(room: RoomState, playerId: string, choice: RPSChoice) {
  const state = room.rps!;
  state.choices[playerId] = choice;
  const ids = room.players.map((player) => player.id);
  if (ids.every((id) => state.choices[id])) {
    const [a, b] = ids;
    const result = determineRPSWinner(state.choices[a]!, state.choices[b]!);
    state.revealedChoices = { ...state.choices };
    state.revealPhase = true;
    state.countdown = 0;
    if (result === 0) {
      state.score.draws += 1;
      state.roundWinner = null;
      state.roundResultText = "Draw!";
    } else if (result === 1) {
      state.score.player1 += 1;
      state.roundWinner = a;
      state.roundResultText = `${room.players[0]?.name ?? "Player 1"} wins the round!`;
    } else {
      state.score.player2 += 1;
      state.roundWinner = b;
      state.roundResultText = `${room.players[1]?.name ?? "Player 2"} wins the round!`;
    }
    const winsNeeded = 3;
    if (state.score.player1 >= winsNeeded) state.score.seriesWinner = a;
    if (state.score.player2 >= winsNeeded) state.score.seriesWinner = b;
    if (!state.score.seriesWinner) state.score.round += 1;
  }
}

export function nextRPSRound(room: RoomState) {
  room.rps = createInitialRPS(room.players.map((player) => player.id));
  return room;
}

export function requestRematch(code: string, playerId: string) {
  const room = getRoom(code);
  if (!room) return null;
  if (!room.rematchVotes.includes(playerId)) room.rematchVotes.push(playerId);
  if (room.rematchVotes.length >= 2 || (room.mode === "ai" && room.rematchVotes.length >= 1)) {
    room.rematchVotes = [];
    if (room.game === "tictactoe") {
      resetTTTRound(room);
    }
    if (room.game === "rps") {
      room.rps = createInitialRPS(room.players.map((player) => player.id));
    }
    room.statusMessage = null;
    emit(room.code, "rematch_started");
    return room;
  }
  emit(room.code, "rematch_requested");
  return room;
}

function cleanupExpired() {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (!room.started && room.expiresAt <= now) {
      rooms.delete(code);
      listeners.delete(code);
    }
  });
}
