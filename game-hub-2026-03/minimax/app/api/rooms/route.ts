import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getRoom, updateRoom } from '@/lib/rooms';
import { TTTPlayer, RPSPlayer } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, game, code, playerId, playerName } = body;

    if (action === 'create') {
      const room = createRoom(game);
      const player1 = { id: playerId, name: playerName, player: (game === 'tictactoe' ? 'X' : 'R') as TTTPlayer | RPSPlayer };
      const updated = updateRoom(room.code, { player1 });
      return NextResponse.json(updated);
    }

    if (action === 'join') {
      const room = getRoom(code);
      if (!room) {
        return NextResponse.json({ error: 'Room not found or expired' }, { status: 404 });
      }

      if (room.player2) {
        return NextResponse.json({ error: 'Room is full' }, { status: 400 });
      }

      const player2 = { id: playerId, name: playerName, player: (room.game === 'tictactoe' ? 'O' : 'P') as TTTPlayer | RPSPlayer };
      const updated = updateRoom(code, { 
        player2,
        state: room.game === 'tictactoe' 
          ? { status: 'playing', board: Array(9).fill(null), turn: 'X' as const, winner: null, winningLine: null }
          : { status: 'rps-choice' }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  const room = getRoom(code);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  return NextResponse.json(room);
}
