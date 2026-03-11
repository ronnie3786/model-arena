import { NextRequest, NextResponse } from "next/server";
import { createRoom, joinRoom } from "@/lib/server/roomStore";
import { GameKind } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { game?: GameKind; name?: string; code?: string; action?: "create" | "join" };

    if (body.action === "create") {
      if (!body.name || !body.game) {
        return NextResponse.json({ error: "Missing game or name" }, { status: 400 });
      }
      const room = createRoom(body.game, body.name.trim());
      return NextResponse.json(room);
    }

    if (body.action === "join") {
      if (!body.name || !body.code) {
        return NextResponse.json({ error: "Missing code or name" }, { status: 400 });
      }
      const joined = joinRoom(body.code.trim().toUpperCase(), body.name.trim());
      return NextResponse.json(joined);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 400 }
    );
  }
}
