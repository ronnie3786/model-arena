import { NextRequest } from 'next/server';
import { getRoom, addClient } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Code required', { status: 400 });
  }

  const room = getRoom(code);
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send(room);

      const cleanup = addClient(code, (updatedRoom) => {
        send(updatedRoom);
      });

      let intervalId: NodeJS.Timeout | null = null;
      
      if (room.state.status === 'waiting') {
        intervalId = setInterval(() => {
          const currentRoom = getRoom(code);
          if (currentRoom && Date.now() > currentRoom.expiresAt && !currentRoom.player2) {
            controller.close();
          }
        }, 5000);
      }

      request.signal.addEventListener('abort', () => {
        cleanup();
        if (intervalId) clearInterval(intervalId);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
