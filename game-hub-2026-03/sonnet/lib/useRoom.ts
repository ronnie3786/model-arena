"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room } from "@/types";

interface UseRoomOptions {
  roomId: string;
  playerId: string;
  onEvent?: (event: { type: string; data: Record<string, unknown> }) => void;
}

interface UseRoomReturn {
  room: Room | null;
  connected: boolean;
  sendAction: (action: string, payload?: Record<string, unknown>) => Promise<void>;
}

export function useRoom({ roomId, playerId, onEvent }: UseRoomOptions): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomId || !playerId) return;

    const url = `/api/sse/${roomId}?playerId=${playerId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as { type: string; data: Record<string, unknown> };
        if (event.data?.room) {
          setRoom(event.data.room as Room);
        }
        onEventRef.current?.(event);
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [roomId, playerId]);

  const sendAction = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      await fetch(`/api/rooms/${roomId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, action, payload }),
      });
    },
    [roomId, playerId]
  );

  return { room, connected, sendAction };
}
