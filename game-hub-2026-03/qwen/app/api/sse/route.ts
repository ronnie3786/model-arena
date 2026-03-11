import { NextRequest } from 'next/server'
import { getRoom, getGameState, addClient, removeClient, broadcastToRoom } from '@/app/lib/roomManager'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomId = searchParams.get('roomId')
  
  if (!roomId) {
    return new Response('Room ID required', { status: 400 })
  }
  
  const room = getRoom(roomId)
  if (!room) {
    return new Response('Room not found', { status: 404 })
  }
  
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const client = {
        readyState: 1,
        send: (data: string) => {
          controller.enqueue(encoder.encode(data))
        },
      }
      
      addClient(roomId, client)
      
      const gameType = room.gameType === 'tic-tac-toe' ? 'tictactoe' : 'rps'
      const gameState = getGameState(roomId, gameType)
      
      if (gameState) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'game-state', payload: { gameState } })}\n\n`))
      }
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', payload: { roomId, players: room.players } })}\n\n`))
    },
  })
  
  request.signal.addEventListener('abort', () => {
    const client = { readyState: 0, send: () => {} }
    removeClient(roomId, client)
    
    const playerCount = (() => {
      const r = getRoom(roomId)
      return r ? r.players.length : 0
    })()
    
    if (playerCount === 0 && room.status === 'playing') {
      broadcastToRoom(roomId, { type: 'player-left', payload: {} })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
