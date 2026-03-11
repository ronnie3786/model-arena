import { joinRoom } from "@/lib/rooms";
import { toJson } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: { roomCode: string } }) {
  const body = await request.json();
  const room = joinRoom(params.roomCode, body.name || "Player 2");
  if (!room) return toJson({ error: "Room not found or expired" }, { status: 404 });
  return toJson({ room });
}
