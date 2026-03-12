export interface RoomEvent {
  type: string;
  data: any;
}

export function subscribeToRoom(roomId: string, listener: (event: RoomEvent) => void) {
  // Simple event emitter implementation for Server-Sent Events
  if (!global.roomListeners) {
    global.roomListeners = new Map();
  }

  if (!global.roomListeners.has(roomId)) {
    global.roomListeners.set(roomId, new Set());
  }

  const listeners = global.roomListeners.get(roomId)!;
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      global.roomListeners.delete(roomId);
    }
  };
}

export function broadcastRoomEvent(roomId: string, event: RoomEvent) {
  if (global.roomListeners && global.roomListeners.has(roomId)) {
    const listeners = global.roomListeners.get(roomId)!;
    listeners.forEach((listener: (e: RoomEvent) => void) => listener(event));
  }
}

// Global typing to persist across hot reloads in dev
declare global {
  var roomListeners: Map<string, Set<(event: RoomEvent) => void>>;
}
