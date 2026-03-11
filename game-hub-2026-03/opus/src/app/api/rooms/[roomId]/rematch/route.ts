import { NextRequest, NextResponse } from 'next/server';
import { requestRematch } from '@/app/lib/rooms';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await request.json();
    const { playerId } = body;

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId' }, { status: 400 });
    }

    const room = requestRematch(params.roomId, playerId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
