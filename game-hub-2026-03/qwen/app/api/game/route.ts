import { NextRequest } from 'next/server'
import { getRoom, updateGameState, broadcastToRoom, addClient, removeClient, markRematchReady } from '@/app/lib/roomManager'
import { TicTacToeState, RPSState } from '@/app/lib/types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { roomId, action, gameState, playerId } = body as {
    roomId: string
    action: string
    gameState: TicTacToeState | RPSState
    playerId: string
  }
  
  const room = getRoom(roomId)
  if (!room) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }
  
  if (action === 'update') {
    const gameType = room.gameType === 'tic-tac-toe' ? 'tictactoe' : 'rps'
    updateGameState(roomId, gameType, gameState)
    
    broadcastToRoom(roomId, {
      type: 'game-state',
      payload: { gameState },
    })
    
    return Response.json({ success: true })
  }
  
  if (action === 'rematch') {
    const allReady = markRematchReady(roomId, playerId)
    
    if (allReady) {
      const gameType = room.gameType === 'tic-tac-toe' ? 'tictactoe' : 'rps'
      const newState = updateGameState(roomId, gameType, gameState)
      
      broadcastToRoom(roomId, {
        type: 'rematch-accepted',
        payload: { gameState },
      })
    } else {
      broadcastToRoom(roomId, {
        type: 'rematch-request',
        payload: { playerId },
      }, undefined)
    }
    
    return Response.json({ success: true, allReady })
  }
  
  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
