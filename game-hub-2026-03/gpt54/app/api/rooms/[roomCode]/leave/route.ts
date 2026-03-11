import { leaveRoom } from "@/lib/rooms";
import { toJson } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: { roomCode: string } }) {
  const body = await request.json();
  const room = leaveRoom(params.roomCode, body.playerId);
  if (!room) return toJson({ error: "Room not found" }, { status: 404 });
  return toJson({ room });
}
