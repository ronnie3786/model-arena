import { subscribeRoom } from "@/lib/server/roomStore";

export const dynamic = "force-dynamic";

type Params = {
  params: {
    code: string;
  };
};

export async function GET(request: Request, { params }: Params): Promise<Response> {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  if (!playerId) {
    return new Response("Missing playerId", { status: 400 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        unsubscribe = subscribeRoom(params.code.toUpperCase(), playerId, send);
      } catch (error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })}\n\n`)
        );
        controller.close();
        return;
      }

      ping = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        if (ping) clearInterval(ping);
        if (unsubscribe) unsubscribe();
        controller.close();
      });
    },
    cancel() {
      if (ping) clearInterval(ping);
      if (unsubscribe) unsubscribe();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
