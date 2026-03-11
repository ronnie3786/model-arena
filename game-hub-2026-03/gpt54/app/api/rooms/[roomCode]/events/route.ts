import { getRoom, subscribe, updateConnection } from "@/lib/rooms";

export async function GET(request: Request, { params }: { params: { roomCode: string } }) {
  const room = getRoom(params.roomCode);
  if (!room) {
    return new Response("Room not found", { status: 404 });
  }

  const playerId = new URL(request.url).searchParams.get("playerId");
  if (playerId) updateConnection(params.roomCode, playerId, true);

  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, payload = getRoom(params.roomCode)) => {
        controller.enqueue(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      send("snapshot", room);
      const unsubscribe = subscribe(params.roomCode, (event) => {
        send(event.type, event.room);
      });

      const heartbeat = setInterval(() => {
        send("heartbeat", getRoom(params.roomCode));
      }, 10000);

      const abort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        if (playerId) updateConnection(params.roomCode, playerId, false);
        controller.close();
      };

      request.signal.addEventListener("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
