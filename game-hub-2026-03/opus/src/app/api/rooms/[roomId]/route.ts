import { NextRequest, NextResponse } from 'next/server';
import { getRoom } from '@/app/lib/rooms';

export async function GET(
  _request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const room = getRoom(params.roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  return NextResponse.json({ room });
}
