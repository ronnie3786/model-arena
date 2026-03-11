import { NextRequest } from 'next/server';
import { subscribeToRoom, disconnectPlayer, getRoomForPlayer } from '@/app/lib/rooms';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const roomId = params.roomId;
  const playerId = request.nextUrl.searchParams.get('playerId');

  const room = getRoomForPlayer(roomId, playerId || '');
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialData = JSON.stringify({ type: 'state_sync', data: { room }, timestamp: Date.now() });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      unsubscribe = subscribeToRoom(roomId, (event) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Send heartbeat every 20 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch {
          // Stream closed
        }
      }, 20000);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (unsubscribe) unsubscribe();
        if (playerId) {
          disconnectPlayer(roomId, playerId);
        }
      });
    },
    cancel() {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (unsubscribe) unsubscribe();
      if (playerId) {
        disconnectPlayer(roomId, playerId);
      }
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
