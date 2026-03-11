import { NextRequest } from 'next/server';
import { roomStore } from '@/lib/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('room');
  const playerId = searchParams.get('player');

  if (!roomCode || !playerId) {
    return new Response('Missing room or player ID', { status: 400 });
  }

  const room = roomStore.getRoomByCode(roomCode.toUpperCase());
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: unknown) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (e) {
          console.error('Error sending SSE event:', e);
        }
      };

      sendEvent({
        type: 'connected',
        data: { room, playerId },
        timestamp: Date.now(),
      });

      const unsubscribe = roomStore.subscribe(room.id, sendEvent);

      const pingInterval = setInterval(() => {
        roomStore.pingPlayer(playerId);
        sendEvent({
          type: 'ping',
          data: { timestamp: Date.now() },
          timestamp: Date.now(),
        });
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        roomStore.disconnectPlayer(playerId);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
