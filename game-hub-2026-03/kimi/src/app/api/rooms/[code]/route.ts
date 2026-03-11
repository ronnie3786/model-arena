import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();
    const room = roomStore.getRoomByCode(code);

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        gameType: room.gameType,
        status: room.status,
        players: room.players.map(p => ({ 
          id: p.id, 
          name: p.name, 
          symbol: p.symbol,
          isConnected: p.isConnected 
        })),
        gameState: room.gameState,
        expiresAt: room.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
