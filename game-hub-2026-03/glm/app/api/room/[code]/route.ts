import { NextRequest } from 'next/server'
import { roomStore } from '@/lib/rooms'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const room = roomStore.getRoom(code.toUpperCase())
  
  if (!room) {
    return new Response('Room not found', { status: 404 })
  }
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      
      roomStore.addClient(code.toUpperCase(), controller as unknown as ReadableStreamDefaultController)
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', room })}\n\n`))
      
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepAlive)
        }
      }, 30000)
      
      const cleanup = () => {
        clearInterval(keepAlive)
        roomStore.removeClient(code.toUpperCase(), controller as unknown as ReadableStreamDefaultController)
      }
      
      request.signal.addEventListener('abort', cleanup)
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const body = await request.json()
  const { action, playerId, playerName, gameState, rematch } = body
  
  const room = roomStore.getRoom(code.toUpperCase())
  
  if (!room) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }
  
  if (action === 'join') {
    if (room.players.length >= 2) {
      return Response.json({ error: 'Room is full' }, { status: 400 })
    }
    
    const updatedRoom = roomStore.joinRoom(code.toUpperCase(), playerId, playerName)
    if (updatedRoom) {
      roomStore.broadcast(code.toUpperCase(), { type: 'player-joined', room: updatedRoom })
      return Response.json({ room: updatedRoom })
    }
    
    return Response.json({ error: 'Failed to join room' }, { status: 400 })
  }
  
  if (action === 'update-state') {
    const updatedRoom = roomStore.updateRoom(code.toUpperCase(), { state: gameState })
    if (updatedRoom) {
      roomStore.broadcast(code.toUpperCase(), { type: 'state-update', state: gameState, playerId })
      return Response.json({ success: true })
    }
  }
  
  if (action === 'rematch') {
    const currentVotes = room.rematchVotes || []
    if (!currentVotes.includes(playerId)) {
      currentVotes.push(playerId)
    }
    
    const updatedRoom = roomStore.updateRoom(code.toUpperCase(), { rematchVotes: currentVotes })
    if (updatedRoom) {
      roomStore.broadcast(code.toUpperCase(), { 
        type: 'rematch-vote', 
        playerId,
        rematchVotes: currentVotes 
      })
      return Response.json({ success: true, rematchVotes: currentVotes })
    }
  }
  
  if (action === 'clear-rematch') {
    const updatedRoom = roomStore.updateRoom(code.toUpperCase(), { rematchVotes: [] })
    if (updatedRoom) {
      roomStore.broadcast(code.toUpperCase(), { type: 'clear-rematch' })
      return Response.json({ success: true })
    }
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
