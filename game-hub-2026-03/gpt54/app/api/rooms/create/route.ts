import { createRoom } from "@/lib/rooms";
import { toJson } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const room = createRoom(body.game, body.name || "Player 1");
  return toJson({ room });
}
