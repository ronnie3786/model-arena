import { NextRequest, NextResponse } from 'next/server';
import { getRooms, Room, GameType } from '@/lib/store';

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { game, playerId, playerName } = body;

  const rooms = getRooms();
  let code = generateRoomCode();
  while (rooms[code]) {
    code = generateRoomCode();
  }

  const newRoom: Room = {
    id: code,
    game: game as GameType,
    players: {
      [playerId]: {
        id: playerId,
        name: playerName,
        connected: false,
        score: 0,
        rematch: false,
      }
    },
    state: game === 'ttt' ? {
      board: Array(9).fill(null),
      turn: 'X', // X starts
      winner: null,
      winningLine: null,
      draw: false,
      playersAssigned: { X: playerId, O: null }
    } : { // RPS
      round: 1,
      player1Choice: null,
      player2Choice: null,
      winner: null, // 'player1', 'player2', 'draw'
      seriesWinner: null,
      playersAssigned: { p1: playerId, p2: null }
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
  };

  rooms[code] = newRoom;
  
  return NextResponse.json({ roomId: code });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { roomId, playerId, playerName } = body;

  const rooms = getRooms();
  const room = rooms[roomId];

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const players = Object.keys(room.players);
  if (players.length >= 2 && !room.players[playerId]) {
    return NextResponse.json({ error: 'Room is full' }, { status: 400 });
  }

  if (!room.players[playerId]) {
    room.players[playerId] = {
      id: playerId,
      name: playerName,
      connected: false,
      score: 0,
      rematch: false,
    };
    
    // Assign player
    if (room.game === 'ttt') {
      if (!room.state.playersAssigned.X) {
        room.state.playersAssigned.X = playerId;
      } else if (!room.state.playersAssigned.O) {
        room.state.playersAssigned.O = playerId;
      }
    } else {
      if (!room.state.playersAssigned.p1) {
        room.state.playersAssigned.p1 = playerId;
      } else if (!room.state.playersAssigned.p2) {
        room.state.playersAssigned.p2 = playerId;
      }
    }
    
    // Once second player joins, clear expiration
    if (Object.keys(room.players).length === 2) {
      room.expiresAt = Infinity; // Disable expiration
    }
  }

  return NextResponse.json({ success: true, room: room });
}

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('roomId');
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  const room = getRooms()[roomId];
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  return NextResponse.json(room);
}