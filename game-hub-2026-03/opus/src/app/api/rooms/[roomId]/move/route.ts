import { NextRequest, NextResponse } from 'next/server';
import { makeTTTMove, makeRPSMove, tttPlayAgain } from '@/app/lib/rooms';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const body = await request.json();
    const { playerId, action, cellIndex, choice } = body;

    if (action === 'ttt_move') {
      const room = makeTTTMove(params.roomId, playerId, cellIndex);
      if (!room) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
      }
      return NextResponse.json({ room });
    }

    if (action === 'rps_move') {
      const room = makeRPSMove(params.roomId, playerId, choice);
      if (!room) {
        return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
      }
      return NextResponse.json({ room });
    }

    if (action === 'ttt_play_again') {
      const room = tttPlayAgain(params.roomId, playerId);
      if (!room) {
        return NextResponse.json({ error: 'Cannot play again' }, { status: 400 });
      }
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
