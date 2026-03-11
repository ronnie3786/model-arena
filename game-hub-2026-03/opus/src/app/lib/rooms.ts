import { Room, RoomEvent, RoomInfo, TTTGameState, RPSGameState, RPSRound, GameType } from './types';

// Persist in-memory store on globalThis to survive Next.js dev mode hot-reloading
interface GameStore {
  rooms: Map<string, Room>;
  roomListeners: Map<string, Set<(event: RoomEvent) => void>>;
  cleanupStarted: boolean;
}

const globalStore = globalThis as unknown as { __gameStore?: GameStore };
if (!globalStore.__gameStore) {
  globalStore.__gameStore = {
    rooms: new Map(),
    roomListeners: new Map(),
    cleanupStarted: false,
  };
}

const rooms = globalStore.__gameStore.rooms;
const roomListeners = globalStore.__gameStore.roomListeners;

// Cleanup expired/stale rooms every 30 seconds (only start once)
if (!globalStore.__gameStore.cleanupStarted) {
  globalStore.__gameStore.cleanupStarted = true;
  setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    // Clean up waiting rooms that expired
    if (room.status === 'waiting' && now > room.expiresAt) {
      broadcastToRoom(id, {
        type: 'room_expired',
        data: {},
        timestamp: Date.now(),
      });
      rooms.delete(id);
      roomListeners.delete(id);
      continue;
    }
    // Clean up finished rooms after 10 minutes
    if (room.status === 'finished' && now > room.createdAt + 10 * 60 * 1000) {
      rooms.delete(id);
      roomListeners.delete(id);
      continue;
    }
    // Clean up rooms where both players disconnected
    if (room.player1 && room.player2 &&
        !room.player1.connected && !room.player2.connected &&
        room.status !== 'waiting') {
      rooms.delete(id);
      roomListeners.delete(id);
    }
  }
  }, 30000);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function createInitialTTTState(): TTTGameState {
  return {
    board: Array(9).fill(null),
    currentTurn: 'X',
    winner: null,
    winningLine: null,
    scores: { player1: 0, player2: 0, draws: 0 },
  };
}

function createInitialRPSState(): RPSGameState {
  return {
    currentRound: 0,
    rounds: [{ player1Choice: null, player2Choice: null, winner: null }],
    seriesWinner: null,
    player1Score: 0,
    player2Score: 0,
  };
}

// Create a sanitized room info that hides RPS choices from the opponent until both have chosen
function toRoomInfoForPlayer(room: Room, playerId?: string): RoomInfo {
  const info: RoomInfo = {
    id: room.id,
    gameType: room.gameType,
    player1: room.player1,
    player2: room.player2,
    status: room.status,
    tttState: room.tttState,
    rpsState: room.rpsState ? sanitizeRPSState(room.rpsState, room, playerId) : null,
    rematchRequests: Array.from(room.rematchRequests),
    expiresAt: room.expiresAt,
  };
  return info;
}

function sanitizeRPSState(state: RPSGameState, room: Room, playerId?: string): RPSGameState {
  const isPlayer1 = room.player1?.id === playerId;
  const sanitizedRounds: RPSRound[] = state.rounds.map((round) => {
    // If both have chosen (round resolved), show everything
    if (round.player1Choice !== null && round.player2Choice !== null) {
      return { ...round };
    }
    // Current round with pending choices: show own choice, hide opponent's
    // We set opponent's choice to null so client can't see it
    if (isPlayer1) {
      return {
        player1Choice: round.player1Choice,
        player2Choice: null, // hide opponent's choice
        winner: round.winner,
      };
    } else {
      return {
        player1Choice: null, // hide opponent's choice
        player2Choice: round.player2Choice,
        winner: round.winner,
      };
    }
  });
  return { ...state, rounds: sanitizedRounds };
}

export function toRoomInfo(room: Room): RoomInfo {
  return {
    id: room.id,
    gameType: room.gameType,
    player1: room.player1,
    player2: room.player2,
    status: room.status,
    tttState: room.tttState,
    rpsState: room.rpsState,
    rematchRequests: Array.from(room.rematchRequests),
    expiresAt: room.expiresAt,
  };
}

export function createRoom(gameType: GameType, playerName: string): { room: RoomInfo; playerId: string } {
  const roomId = generateRoomCode();
  const playerId = generatePlayerId();

  const room: Room = {
    id: roomId,
    gameType,
    player1: { id: playerId, name: playerName, connected: true },
    player2: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
    status: 'waiting',
    tttState: gameType === 'tictactoe' ? createInitialTTTState() : null,
    rpsState: gameType === 'rps' ? createInitialRPSState() : null,
    rematchRequests: new Set(),
  };

  rooms.set(roomId, room);
  roomListeners.set(roomId, new Set());

  return { room: toRoomInfo(room), playerId };
}

export function joinRoom(roomId: string, playerName: string): { room: RoomInfo; playerId: string } | null {
  const room = rooms.get(roomId);
  if (!room || room.status !== 'waiting' || room.player2 !== null) {
    return null;
  }

  const playerId = generatePlayerId();
  room.player2 = { id: playerId, name: playerName, connected: true };
  room.status = 'playing';

  broadcastToRoom(roomId, {
    type: 'player_joined',
    data: { player: room.player2 },
    timestamp: Date.now(),
  });

  broadcastToRoom(roomId, {
    type: 'game_start',
    data: { room: toRoomInfo(room) },
    timestamp: Date.now(),
  });

  return { room: toRoomInfo(room), playerId };
}

export function getRoom(roomId: string): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  return toRoomInfo(room);
}

export function getRoomForPlayer(roomId: string, playerId: string): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  return toRoomInfoForPlayer(room, playerId);
}

// TTT move
export function makeTTTMove(roomId: string, playerId: string, cellIndex: number): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room || !room.tttState || room.status !== 'playing') return null;

  const state = room.tttState;
  if (state.winner) return null;
  if (state.board[cellIndex] !== null) return null;

  // Determine which player
  const isPlayer1 = room.player1?.id === playerId;
  const isPlayer2 = room.player2?.id === playerId;
  if (!isPlayer1 && !isPlayer2) return null;

  const playerMark = isPlayer1 ? 'X' : 'O';
  if (state.currentTurn !== playerMark) return null;

  state.board[cellIndex] = playerMark;
  state.currentTurn = playerMark === 'X' ? 'O' : 'X';

  // Check win
  const winResult = checkTTTWin(state.board);
  if (winResult) {
    state.winner = winResult.winner;
    state.winningLine = winResult.line;
    if (winResult.winner === 'X') state.scores.player1++;
    else if (winResult.winner === 'O') state.scores.player2++;
  } else if (state.board.every(c => c !== null)) {
    state.winner = 'draw';
    state.scores.draws++;
  }

  broadcastToRoom(roomId, {
    type: 'move',
    data: { room: toRoomInfo(room), cellIndex, playerMark },
    timestamp: Date.now(),
  });

  if (state.winner) {
    broadcastToRoom(roomId, {
      type: 'game_over',
      data: { room: toRoomInfo(room) },
      timestamp: Date.now(),
    });
  }

  return toRoomInfo(room);
}

// RPS move
export function makeRPSMove(roomId: string, playerId: string, choice: 'rock' | 'paper' | 'scissors'): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room || !room.rpsState || room.status !== 'playing') return null;
  if (room.rpsState.seriesWinner) return null;

  const state = room.rpsState;
  const round = state.rounds[state.currentRound];
  if (!round) return null;

  const isPlayer1 = room.player1?.id === playerId;
  const isPlayer2 = room.player2?.id === playerId;
  if (!isPlayer1 && !isPlayer2) return null;

  if (isPlayer1) {
    if (round.player1Choice !== null) return null; // already chose
    round.player1Choice = choice;
  } else {
    if (round.player2Choice !== null) return null;
    round.player2Choice = choice;
  }

  const bothChosen = round.player1Choice !== null && round.player2Choice !== null;

  // Broadcast that a player has made their choice (sanitized - no opponent choice leak)
  // Use per-player broadcasts to hide choices
  if (room.player1) {
    broadcastToRoom(roomId, {
      type: 'move',
      data: {
        playerId,
        hasChosen: true,
        bothChosen,
        room: toRoomInfoForPlayer(room, room.player1.id),
      },
      timestamp: Date.now(),
    });
  }

  // If both have chosen, resolve round
  if (bothChosen) {
    round.winner = resolveRPS(round.player1Choice!, round.player2Choice!);
    if (round.winner === 'player1') state.player1Score++;
    else if (round.winner === 'player2') state.player2Score++;

    // Check series winner (first to 3 wins)
    if (state.player1Score >= 3) {
      state.seriesWinner = 'player1';
      room.status = 'finished';
    } else if (state.player2Score >= 3) {
      state.seriesWinner = 'player2';
      room.status = 'finished';
    } else if (state.currentRound >= 4) {
      // All 5 rounds played - if tied, play extra rounds
      if (state.player1Score !== state.player2Score) {
        state.seriesWinner = state.player1Score > state.player2Score ? 'player1' : 'player2';
        room.status = 'finished';
      } else {
        // Tied: add extra round
        state.currentRound++;
        state.rounds.push({ player1Choice: null, player2Choice: null, winner: null });
      }
    } else {
      // Next round
      state.currentRound++;
      state.rounds.push({ player1Choice: null, player2Choice: null, winner: null });
    }

    // Broadcast round result with full choices now visible
    broadcastToRoom(roomId, {
      type: 'game_over',
      data: { room: toRoomInfo(room), roundResult: round },
      timestamp: Date.now(),
    });
  }

  return toRoomInfoForPlayer(room, playerId);
}

function resolveRPS(p1: 'rock' | 'paper' | 'scissors', p2: 'rock' | 'paper' | 'scissors'): 'player1' | 'player2' | 'draw' {
  if (p1 === p2) return 'draw';
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) return 'player1';
  return 'player2';
}

function checkTTTWin(board: (string | null)[]): { winner: 'X' | 'O'; line: number[] } | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line };
    }
  }
  return null;
}

// Rematch
export function requestRematch(roomId: string, playerId: string): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Validate player is in this room
  if (room.player1?.id !== playerId && room.player2?.id !== playerId) return null;

  room.rematchRequests.add(playerId);

  const bothRequested =
    room.player1 && room.player2 &&
    room.rematchRequests.has(room.player1.id) &&
    room.rematchRequests.has(room.player2.id);

  if (bothRequested) {
    // Reset game state
    room.rematchRequests.clear();
    room.status = 'playing';

    if (room.gameType === 'tictactoe' && room.tttState) {
      const scores = { ...room.tttState.scores };
      room.tttState = createInitialTTTState();
      room.tttState.scores = scores;
    } else if (room.gameType === 'rps') {
      room.rpsState = createInitialRPSState();
    }

    broadcastToRoom(roomId, {
      type: 'rematch_accepted',
      data: { room: toRoomInfo(room) },
      timestamp: Date.now(),
    });
  } else {
    broadcastToRoom(roomId, {
      type: 'rematch_requested',
      data: { playerId, room: toRoomInfo(room) },
      timestamp: Date.now(),
    });
  }

  return toRoomInfo(room);
}

// TTT play again (both players must agree via rematch mechanism)
export function tttPlayAgain(roomId: string, playerId: string): RoomInfo | null {
  const room = rooms.get(roomId);
  if (!room || !room.tttState) return null;

  // Validate player is in this room
  if (room.player1?.id !== playerId && room.player2?.id !== playerId) return null;

  room.rematchRequests.add(playerId);

  const bothRequested =
    room.player1 && room.player2 &&
    room.rematchRequests.has(room.player1.id) &&
    room.rematchRequests.has(room.player2.id);

  if (bothRequested) {
    const scores = { ...room.tttState.scores };
    room.tttState = createInitialTTTState();
    room.tttState.scores = scores;
    room.status = 'playing';
    room.rematchRequests.clear();

    broadcastToRoom(roomId, {
      type: 'state_sync',
      data: { room: toRoomInfo(room) },
      timestamp: Date.now(),
    });
  } else {
    broadcastToRoom(roomId, {
      type: 'rematch_requested',
      data: { playerId, room: toRoomInfo(room) },
      timestamp: Date.now(),
    });
  }

  return toRoomInfo(room);
}

// Disconnect
export function disconnectPlayer(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  if (room.player1?.id === playerId) {
    room.player1.connected = false;
  } else if (room.player2?.id === playerId) {
    room.player2.connected = false;
  }

  broadcastToRoom(roomId, {
    type: 'player_disconnected',
    data: { playerId, room: toRoomInfo(room) },
    timestamp: Date.now(),
  });
}

// SSE
export function subscribeToRoom(roomId: string, listener: (event: RoomEvent) => void): () => void {
  if (!roomListeners.has(roomId)) {
    roomListeners.set(roomId, new Set());
  }
  roomListeners.get(roomId)!.add(listener);

  return () => {
    roomListeners.get(roomId)?.delete(listener);
  };
}

function broadcastToRoom(roomId: string, event: RoomEvent): void {
  const listeners = roomListeners.get(roomId);
  if (listeners) {
    for (const listener of listeners) {
      listener(event);
    }
  }
}
