import { NextRequest, NextResponse } from 'next/server'
import { roomStore } from '@/lib/rooms'

export async function POST(request: NextRequest) {
  const { game, playerName, playerId } = await request.json()
  
  if (!game || !playerName || !playerId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  const code = roomStore.generateCode()
  const room = roomStore.createRoom(code, game, playerId, playerName)
  
  return NextResponse.json({
    code: room.code,
    room,
  })
}

export async function GET() {
  const rooms = roomStore.listRooms()
  return NextResponse.json({ rooms: rooms.map(room => ({
    code: room.code,
    game: room.game,
    players: room.players.length,
  })) })
}
