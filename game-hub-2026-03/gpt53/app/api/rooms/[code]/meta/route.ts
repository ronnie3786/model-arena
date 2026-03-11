import { NextResponse } from "next/server";
import { getRoom } from "@/lib/server/roomStore";

export const dynamic = "force-dynamic";

type Params = {
  params: {
    code: string;
  };
};

export async function GET(_: Request, { params }: Params): Promise<NextResponse> {
  try {
    const snapshot = getRoom(params.code.toUpperCase(), "");
    return NextResponse.json({ game: snapshot.game, status: snapshot.status, code: snapshot.code });
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
}
