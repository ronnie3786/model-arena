import { Choice, GameKind, RoomAction, RoomSnapshot, TttState } from "@/lib/types";

type Subscriber = {
  playerId: string;
  send: (snapshot: RoomSnapshot) => void;
};

type RoomInternal = {
  code: string;
  game: GameKind;
  status: "waiting" | "active" | "expired";
  createdAt: number;
  expiresAt: number;
  players: Array<{
    id: string;
    name: string;
    connected: boolean;
    rematchAccepted: boolean;
  }>;
  ttt: TttState;
  rps: {
    round: number;
    bestOf: number;
    wins: Record<string, number>;
    choices: Record<string, Choice | null>;
    bothChosen: boolean;
    roundWinner: string | "draw" | null;
    seriesWinner: string | "draw" | null;
  };
  subscribers: Subscriber[];
};

type Store = {
  rooms: Map<string, RoomInternal>;
};

const g = globalThis as unknown as { __hubStore?: Store };

const store: Store =
  g.__hubStore ?? {
    rooms: new Map<string, RoomInternal>()
  };

g.__hubStore = store;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function roomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 6; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function createInitialTtt(): TttState {
  return {
    board: Array.from({ length: 9 }, () => null),
    turn: "X",
    winner: null,
    winningLine: null,
    scores: { player1: 0, player2: 0, draws: 0 }
  };
}

function isRoomExpired(room: RoomInternal): boolean {
  return room.status === "waiting" && Date.now() > room.expiresAt;
}

function clearExpiredRooms(): void {
  for (const room of store.rooms.values()) {
    if (isRoomExpired(room)) {
      room.status = "expired";
      broadcast(room);
      store.rooms.delete(room.code);
    }
  }
}

function winner(board: Array<"X" | "O" | null>): { value: "X" | "O" | "draw" | null; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { value: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { value: "draw", line: null };
  }
  return { value: null, line: null };
}

function decideRps(a: Choice, b: Choice): "a" | "b" | "draw" {
  if (a === b) return "draw";
  if (
    (a === "rock" && b === "scissors") ||
    (a === "paper" && b === "rock") ||
    (a === "scissors" && b === "paper")
  ) {
    return "a";
  }
  return "b";
}

function snapshotFor(room: RoomInternal, playerId: string): RoomSnapshot {
  const rpsChoices: Record<string, Choice | null> = {};
  for (const player of room.players) {
    if (!room.rps.bothChosen && player.id !== playerId) {
      rpsChoices[player.id] = null;
    } else {
      rpsChoices[player.id] = room.rps.choices[player.id] ?? null;
    }
  }

  return {
    code: room.code,
    game: room.game,
    status: room.status,
    expiresAt: room.expiresAt,
    players: room.players,
    ttt: room.game === "ttt" ? room.ttt : undefined,
    rps:
      room.game === "rps"
        ? {
            ...room.rps,
            choices: rpsChoices
          }
        : undefined
  };
}

function broadcast(room: RoomInternal): void {
  room.subscribers.forEach((sub) => {
    sub.send(snapshotFor(room, sub.playerId));
  });
}

function resetForRematch(room: RoomInternal): void {
  room.players.forEach((player) => {
    player.rematchAccepted = false;
  });
  room.ttt = createInitialTtt();
  room.rps = {
    round: 1,
    bestOf: 5,
    wins: Object.fromEntries(room.players.map((p) => [p.id, 0])),
    choices: Object.fromEntries(room.players.map((p) => [p.id, null])),
    bothChosen: false,
    roundWinner: null,
    seriesWinner: null
  };
}

export function createRoom(game: GameKind, playerName: string): { code: string; playerId: string; expiresAt: number } {
  clearExpiredRooms();
  let code = roomCode();
  while (store.rooms.has(code)) {
    code = roomCode();
  }

  const playerId = uid();
  const room: RoomInternal = {
    code,
    game,
    status: "waiting",
    createdAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 1000,
    players: [{ id: playerId, name: playerName, connected: false, rematchAccepted: false }],
    ttt: createInitialTtt(),
    rps: {
      round: 1,
      bestOf: 5,
      wins: { [playerId]: 0 },
      choices: { [playerId]: null },
      bothChosen: false,
      roundWinner: null,
      seriesWinner: null
    },
    subscribers: []
  };

  store.rooms.set(code, room);
  return { code, playerId, expiresAt: room.expiresAt };
}

export function joinRoom(code: string, name: string): { playerId: string } {
  clearExpiredRooms();
  const room = store.rooms.get(code.toUpperCase());
  if (!room || room.status === "expired") {
    throw new Error("Room not found or expired");
  }
  if (room.players.length >= 2) {
    throw new Error("Room is full");
  }

  const playerId = uid();
  room.players.push({ id: playerId, name, connected: false, rematchAccepted: false });
  room.status = "active";

  room.rps.wins[playerId] = 0;
  room.rps.choices[playerId] = null;
  broadcast(room);
  return { playerId };
}

export function getRoom(code: string, playerId: string): RoomSnapshot {
  clearExpiredRooms();
  const room = store.rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error("Room not found");
  }
  return snapshotFor(room, playerId);
}

export function subscribeRoom(code: string, playerId: string, send: (snapshot: RoomSnapshot) => void): () => void {
  const room = store.rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error("Room not found");
  }

  const player = room.players.find((entry) => entry.id === playerId);
  if (player) {
    player.connected = true;
  }

  const sub: Subscriber = { playerId, send };
  room.subscribers.push(sub);
  send(snapshotFor(room, playerId));
  broadcast(room);

  return () => {
    const target = store.rooms.get(code.toUpperCase());
    if (!target) return;
    target.subscribers = target.subscribers.filter((entry) => entry !== sub);
    const current = target.players.find((entry) => entry.id === playerId);
    if (current) {
      current.connected = false;
    }
    broadcast(target);
  };
}

export function applyRoomAction(code: string, playerId: string, action: RoomAction): RoomSnapshot {
  const room = store.rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error("Room not found");
  }

  const me = room.players.find((player) => player.id === playerId);
  if (!me) {
    throw new Error("Player not in room");
  }

  if (action.type === "heartbeat") {
    return snapshotFor(room, playerId);
  }

  if (action.type === "rematch") {
    me.rematchAccepted = true;
    if (room.players.length === 2 && room.players.every((player) => player.rematchAccepted)) {
      resetForRematch(room);
      room.status = "active";
    }
    broadcast(room);
    return snapshotFor(room, playerId);
  }

  if (room.game === "ttt") {
    if (action.type === "ttt_next_round") {
      room.ttt.board = Array.from({ length: 9 }, () => null);
      room.ttt.turn = "X";
      room.ttt.winner = null;
      room.ttt.winningLine = null;
      room.players.forEach((player) => {
        player.rematchAccepted = false;
      });
      broadcast(room);
      return snapshotFor(room, playerId);
    }

    if (action.type === "ttt_move") {
      if (room.ttt.winner) {
        return snapshotFor(room, playerId);
      }
      const symbol = room.players[0]?.id === playerId ? "X" : "O";
      if (symbol !== room.ttt.turn) {
        return snapshotFor(room, playerId);
      }
      if (action.index < 0 || action.index > 8 || room.ttt.board[action.index]) {
        return snapshotFor(room, playerId);
      }

      room.ttt.board[action.index] = symbol;
      const currentWinner = winner(room.ttt.board);
      room.ttt.winner = currentWinner.value;
      room.ttt.winningLine = currentWinner.line;

      if (currentWinner.value === "X") room.ttt.scores.player1 += 1;
      if (currentWinner.value === "O") room.ttt.scores.player2 += 1;
      if (currentWinner.value === "draw") room.ttt.scores.draws += 1;

      if (!currentWinner.value) {
        room.ttt.turn = room.ttt.turn === "X" ? "O" : "X";
      }
      broadcast(room);
      return snapshotFor(room, playerId);
    }
  }

  if (room.game === "rps") {
    if (action.type === "rps_pick") {
      if (room.rps.seriesWinner) {
        return snapshotFor(room, playerId);
      }
      if (room.rps.choices[playerId]) {
        return snapshotFor(room, playerId);
      }

      room.rps.choices[playerId] = action.choice;
      const ids = room.players.map((p) => p.id);
      if (ids.length === 2 && room.rps.choices[ids[0]] && room.rps.choices[ids[1]]) {
        room.rps.bothChosen = true;
        const result = decideRps(room.rps.choices[ids[0]] as Choice, room.rps.choices[ids[1]] as Choice);
        if (result === "a") {
          room.rps.roundWinner = ids[0];
          room.rps.wins[ids[0]] += 1;
        } else if (result === "b") {
          room.rps.roundWinner = ids[1];
          room.rps.wins[ids[1]] += 1;
        } else {
          room.rps.roundWinner = "draw";
        }

        if (room.rps.wins[ids[0]] >= 3 || room.rps.wins[ids[1]] >= 3 || room.rps.round >= room.rps.bestOf) {
          if (room.rps.wins[ids[0]] === room.rps.wins[ids[1]]) {
            room.rps.seriesWinner = "draw";
          } else {
            room.rps.seriesWinner = room.rps.wins[ids[0]] > room.rps.wins[ids[1]] ? ids[0] : ids[1];
          }
        }
      }

      broadcast(room);
      return snapshotFor(room, playerId);
    }

    if (action.type === "rps_next_round") {
      const ids = room.players.map((p) => p.id);
      if (!room.rps.seriesWinner) {
        room.rps.round += 1;
      }
      room.rps.bothChosen = false;
      room.rps.roundWinner = null;
      ids.forEach((id) => {
        room.rps.choices[id] = null;
      });
      broadcast(room);
      return snapshotFor(room, playerId);
    }
  }

  return snapshotFor(room, playerId);
}
