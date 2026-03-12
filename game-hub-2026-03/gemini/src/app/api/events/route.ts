export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRooms, addClient, removeClient, broadcast } from '@/lib/store';

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  const playerId = req.nextUrl.searchParams.get('playerId');

  if (!roomId || !playerId) {
    return new Response('Missing roomId or playerId', { status: 400 });
  }

  const rooms = getRooms();
  if (!rooms[roomId]) {
    return new Response('Room not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let keepAliveInterval: any;

  const stream = new ReadableStream({
    start(controller) {
      const sendFn = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      addClient(roomId, playerId, sendFn);
      
      // Update room state
      if (rooms[roomId] && rooms[roomId].players[playerId]) {
        rooms[roomId].players[playerId].connected = true;
        // Broadcast state update
        broadcast(roomId, { type: 'STATE_UPDATE', state: rooms[roomId] });
      }

      keepAliveInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      req.signal.addEventListener('abort', () => {
        clearInterval(keepAliveInterval);
        removeClient(roomId, playerId);
        if (rooms[roomId] && rooms[roomId].players[playerId]) {
          rooms[roomId].players[playerId].connected = false;
          broadcast(roomId, { type: 'STATE_UPDATE', state: rooms[roomId] });
        }
        controller.close();
      });
    },
    cancel() {
      clearInterval(keepAliveInterval);
      removeClient(roomId, playerId);
      if (rooms[roomId] && rooms[roomId].players[playerId]) {
        rooms[roomId].players[playerId].connected = false;
        broadcast(roomId, { type: 'STATE_UPDATE', state: rooms[roomId] });
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
