import { NextRequest, NextResponse } from 'next/server';
import { createRoom } from '@/app/lib/rooms';
import { GameType } from '@/app/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, playerName } = body as { gameType: GameType; playerName: string };

    if (!gameType || !playerName) {
      return NextResponse.json({ error: 'Missing gameType or playerName' }, { status: 400 });
    }

    if (gameType !== 'tictactoe' && gameType !== 'rps') {
      return NextResponse.json({ error: 'Invalid gameType' }, { status: 400 });
    }

    const result = createRoom(gameType, playerName);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
