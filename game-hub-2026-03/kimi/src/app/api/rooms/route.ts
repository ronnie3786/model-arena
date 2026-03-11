import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/store';
import { GameType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameType, playerName } = body;

    if (!gameType || !playerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['tic-tac-toe', 'rock-paper-scissors'].includes(gameType)) {
      return NextResponse.json(
        { error: 'Invalid game type' },
        { status: 400 }
      );
    }

    const room = roomStore.createRoom(gameType as GameType, playerName);

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        gameType: room.gameType,
        status: room.status,
        players: room.players.map(p => ({ id: p.id, name: p.name, symbol: p.symbol })),
        expiresAt: room.expiresAt,
      },
      playerId: room.players[0].id,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
