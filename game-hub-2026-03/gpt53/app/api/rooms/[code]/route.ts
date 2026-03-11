import { NextRequest, NextResponse } from "next/server";
import { applyRoomAction, getRoom } from "@/lib/server/roomStore";
import { RoomAction } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = {
  params: {
    code: string;
  };
};

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  try {
    const room = getRoom(params.code.toUpperCase(), playerId);
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { playerId?: string; action?: RoomAction };
    if (!body.playerId || !body.action) {
      return NextResponse.json({ error: "Missing playerId or action" }, { status: 400 });
    }

    const snapshot = applyRoomAction(params.code.toUpperCase(), body.playerId, body.action);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
