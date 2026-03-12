'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Room } from '@/lib/server/store';

export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setError(null);
      return;
    }

    let retryCount = 0;
    const maxRetries = 5;

    const connect = () => {
      // Fetch initial state first
      fetch(`/api/room/${roomId}`)
        .then(res => {
           if (!res.ok) throw new Error('Room not found');
           return res.json();
        })
        .then(data => {
            setRoom(data);
            
            // Then subscribe to events
            const eventSource = new EventSource(`/api/room/${roomId}/events`);
            eventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
              try {
                const parsed = JSON.parse(event.data);
                if (parsed.type === 'ROOM_UPDATE' || parsed.type === 'GAME_UPDATE') {
                  setRoom(parsed.data);
                }
              } catch (e) {
                console.error('Error parsing SSE event', e);
              }
            };

            eventSource.onerror = (err) => {
              console.error('EventSource error', err);
              eventSource.close();
              
              // Attempt reconnect
              if (retryCount < maxRetries) {
                 retryCount++;
                 setTimeout(connect, 1000 * retryCount);
              } else {
                 setError('Connection lost');
              }
            };
        })
        .catch(err => setError(err.message));
    };

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [roomId]);

  const sendAction = useCallback(async (action: string, payload: any = {}) => {
      if (!roomId) return;
      try {
         const res = await fetch(`/api/room/${roomId}/action`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action, payload })
         });
         
         if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to send action');
         }
      } catch (err) {
         console.error('Action error', err);
      }
  }, [roomId]);

  return { room, error, sendAction };
}
