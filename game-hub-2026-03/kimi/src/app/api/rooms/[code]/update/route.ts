import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/store';

export async function POST(
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

    const body = await request.json();
    const { gameState } = body;

    if (!gameState) {
      return NextResponse.json(
        { error: 'Missing game state' },
        { status: 400 }
      );
    }

    const updatedRoom = roomStore.updateGameState(room.id, gameState);

    return NextResponse.json({
      room: {
        id: updatedRoom!.id,
        code: updatedRoom!.code,
        gameType: updatedRoom!.gameType,
        status: updatedRoom!.status,
        players: updatedRoom!.players.map(p => ({ 
          id: p.id, 
          name: p.name, 
          symbol: p.symbol 
        })),
        gameState: updatedRoom!.gameState,
      },
    });
  } catch (error) {
    console.error('Error updating game state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
