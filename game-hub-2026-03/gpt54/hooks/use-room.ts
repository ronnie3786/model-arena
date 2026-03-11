"use client";

import { useEffect, useMemo, useState } from "react";
import { RoomState } from "@/lib/types";

export function useRoom(roomCode?: string, playerId?: string, initialRoom?: RoomState | null) {
  const [room, setRoom] = useState<RoomState | null>(initialRoom ?? null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomCode || !playerId) return;
    const source = new EventSource(`/api/rooms/${roomCode}/events?playerId=${playerId}`);

    const onMessage = (event: MessageEvent<string>) => {
      try {
        setRoom(JSON.parse(event.data));
      } catch {
        return;
      }
    };

    source.addEventListener("snapshot", onMessage as EventListener);
    source.addEventListener("heartbeat", onMessage as EventListener);
    source.addEventListener("player_joined", onMessage as EventListener);
    source.addEventListener("player_connected", onMessage as EventListener);
    source.addEventListener("player_disconnected", onMessage as EventListener);
    source.addEventListener("ttt_move", onMessage as EventListener);
    source.addEventListener("ttt_ai_move", onMessage as EventListener);
    source.addEventListener("ttt_reset", onMessage as EventListener);
    source.addEventListener("rps_pick", onMessage as EventListener);
    source.addEventListener("rps_next_round", onMessage as EventListener);
    source.addEventListener("rematch_requested", onMessage as EventListener);
    source.addEventListener("rematch_started", onMessage as EventListener);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    return () => {
      setConnected(false);
      source.close();
    };
  }, [playerId, roomCode]);

  const countdownMs = useMemo(() => {
    if (!room?.expiresAt || room.started) return 0;
    return Math.max(0, room.expiresAt - Date.now());
  }, [room?.expiresAt, room?.started]);

  return { room, setRoom, connected, countdownMs };
}
