import { NextRequest } from "next/server";
import {
  getRoom,
  subscribe,
  broadcast,
  markDisconnected,
  markConnected,
  serializeRoom,
} from "@/lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const roomId = params.id;
  const playerId = req.nextUrl.searchParams.get("playerId") || "";

  const room = getRoom(roomId);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  // Mark player as connected
  if (playerId) markConnected(roomId, playerId);

  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initial = JSON.stringify({
        type: "room_update",
        data: { room: serializeRoom(room) },
      });
      controller.enqueue(new TextEncoder().encode(`data: ${initial}\n\n`));

      unsubscribe = subscribe(roomId, controller);

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        if (playerId) {
          markDisconnected(roomId, playerId);
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (playerId) {
        markDisconnected(roomId, playerId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
