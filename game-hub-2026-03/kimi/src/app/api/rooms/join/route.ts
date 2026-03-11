import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, playerName } = body;

    if (!code || !playerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const room = roomStore.joinRoom(code.toUpperCase(), playerName);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found or full' },
        { status: 404 }
      );
    }

    const newPlayer = room.players[room.players.length - 1];

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        gameType: room.gameType,
        status: room.status,
        players: room.players.map(p => ({ id: p.id, name: p.name, symbol: p.symbol })),
        gameState: room.gameState,
      },
      playerId: newPlayer.id,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
