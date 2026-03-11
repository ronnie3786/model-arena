import { NextRequest, NextResponse } from "next/server";
import { getRoom, joinRoom, serializeRoom } from "@/lib/rooms";

// GET /api/rooms/[id] — get room state
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const room = getRoom(params.id);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  return NextResponse.json({ room: serializeRoom(room) });
}

// POST /api/rooms/[id]/join handled in sub-route
// PATCH /api/rooms/[id] — join room
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { playerName } = body as { playerName: string };

  if (!playerName?.trim()) {
    return NextResponse.json({ error: "Player name required" }, { status: 400 });
  }

  const result = joinRoom(params.id, playerName.trim().slice(0, 20));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ room: serializeRoom(result.room), playerId: result.playerId });
}
