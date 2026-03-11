import { NextRequest, NextResponse } from "next/server";
import { createRoom, getRoomByCode, serializeRoom } from "@/lib/rooms";
import { GameType } from "@/types";

// POST /api/rooms — create a room
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gameType, playerName } = body as { gameType: GameType; playerName: string };

  if (!gameType || !["ttt", "rps"].includes(gameType)) {
    return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
  }
  if (!playerName?.trim()) {
    return NextResponse.json({ error: "Player name required" }, { status: 400 });
  }

  const room = createRoom(gameType, playerName.trim().slice(0, 20));
  return NextResponse.json({ room: serializeRoom(room), playerId: room.players[0]!.id });
}

// GET /api/rooms?code=XXXXXX — find room by code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const room = getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ room: serializeRoom(room) });
}
