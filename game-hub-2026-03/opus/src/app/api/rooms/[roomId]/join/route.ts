import { NextRequest, NextResponse } from 'next/server';
import { joinRoom } from '@/app/lib/rooms';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await request.json();
    const { playerName } = body as { playerName: string };

    if (!playerName) {
      return NextResponse.json({ error: 'Missing playerName' }, { status: 400 });
    }

    const result = joinRoom(params.roomId, playerName);
    if (!result) {
      return NextResponse.json({ error: 'Room not found or full' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
