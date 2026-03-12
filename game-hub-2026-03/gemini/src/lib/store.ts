export type GameType = 'ttt' | 'rps';

export interface Player {
  id: string;
  name: string;
  connected: boolean;
  score: number;
  rematch: boolean;
  choice?: string; // For RPS
}

export interface Room {
  id: string;
  game: GameType;
  players: Record<string, Player>;
  state: any;
  createdAt: number;
  expiresAt: number;
}

declare global {
  var rooms: Record<string, Room>;
  var clients: Record<string, Record<string, (data: any) => void>>;
}

if (!global.rooms) {
  global.rooms = {};
}
if (!global.clients) {
  global.clients = {};
}

export const getRooms = () => global.rooms;

export const getClients = () => global.clients;

export const addClient = (roomId: string, playerId: string, sendFn: (data: any) => void) => {
  if (!global.clients[roomId]) {
    global.clients[roomId] = {};
  }
  global.clients[roomId][playerId] = sendFn;
};

export const removeClient = (roomId: string, playerId: string) => {
  if (global.clients[roomId]) {
    delete global.clients[roomId][playerId];
  }
};

export const broadcast = (roomId: string, data: any) => {
  if (global.clients[roomId]) {
    Object.values(global.clients[roomId]).forEach(sendFn => {
      try {
        sendFn(data);
      } catch (e) {
        // Handle disconnected client
      }
    });
  }
};
