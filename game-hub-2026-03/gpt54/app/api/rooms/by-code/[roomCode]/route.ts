import { getRoom } from "@/lib/rooms";
import { toJson } from "@/lib/utils";

export async function GET(_: Request, { params }: { params: { roomCode: string } }) {
  const room = getRoom(params.roomCode);
  if (!room) return toJson({ error: "Room not found" }, { status: 404 });
  return toJson({ room });
}
