import { NextRequest } from 'next/server'
import { createRoom, getRoom, joinRoom, addClient, removeClient, broadcastToRoom, getPlayerCount, deleteRoom } from '@/app/lib/roomManager'
import { Player, GameType, GameMode } from '@/app/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { gameType, mode, playerName } = body as { gameType: GameType; mode: GameMode; playerName: string }
  
  const player: Player = {
    id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: playerName || `Player ${Math.floor(Math.random() * 1000)}`,
    symbol: 'X',
  }
  
  const room = createRoom(gameType, mode, player)
  
  return Response.json({
    roomId: room.id,
    playerId: player.id,
    playerName: player.name,
    mode,
    gameType,
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomId = searchParams.get('roomId')
  const action = searchParams.get('action')
  
  if (!roomId) {
    return Response.json({ error: 'Room ID required' }, { status: 400 })
  }
  
  if (action === 'join') {
    const playerName = searchParams.get('playerName')
    const player: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: playerName || `Player ${Math.floor(Math.random() * 1000)}`,
      symbol: 'O',
    }
    
    const result = joinRoom(roomId, player)
    
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 })
    }
    
    broadcastToRoom(roomId, {
      type: 'player-joined',
      payload: { player },
    })
    
    broadcastToRoom(roomId, {
      type: 'game-start',
      payload: { room: result.room },
    })
    
    return Response.json({
      success: true,
      playerId: player.id,
      playerName: player.name,
      room: result.room,
    })
  }
  
  const room = getRoom(roomId)
  if (!room) {
    return Response.json({ error: 'Room not found or expired' }, { status: 404 })
  }
  
  return Response.json({ room })
}
