import { useState, useEffect, useCallback, useRef } from 'react';

export function useMultiplayer(roomId: string | null, isAI: boolean) {
  const [room, setRoom] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const playerId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null;
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isAI || !roomId || !playerId) return;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/events?roomId=${roomId}&playerId=${playerId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE') {
            setRoom(data.state);
          }
        } catch (e) {
          console.error("Failed to parse event data", e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setConnected(false);
        eventSource.close();
        // Reconnect logic
        setTimeout(connect, 3000);
      };
    };

    // Initial fetch to ensure we're registered and get latest state
    fetch(`/api/room?roomId=${roomId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setRoom(data);
          connect();
        }
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
    };
  }, [roomId, playerId, isAI]);

  const performAction = useCallback(async (action: string, payload: any = {}) => {
    if (isAI || !roomId || !playerId) return;

    await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId, action, payload }),
    });
  }, [roomId, playerId, isAI]);

  return { room, connected, playerId, performAction };
}
