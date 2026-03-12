import { NextRequest, NextResponse } from 'next/server';
import { getRooms, broadcast } from '@/lib/store';

function checkWinner(board: any[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: lines[i] };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { roomId, playerId, action, payload } = body;

  const room = getRooms()[roomId];
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.game === 'ttt') {
    if (action === 'MOVE') {
      const { index } = payload;
      const turn = room.state.turn;
      const playerMark = room.state.playersAssigned.X === playerId ? 'X' : 'O';

      if (turn === playerMark && !room.state.board[index] && !room.state.winner && !room.state.draw) {
        room.state.board[index] = playerMark;
        
        const winResult = checkWinner(room.state.board);
        if (winResult) {
          room.state.winner = winResult.winner;
          room.state.winningLine = winResult.line;
          room.players[playerId].score++;
        } else if (room.state.board.every((c: any) => c !== null)) {
          room.state.draw = true;
          room.state.drawCount = (room.state.drawCount || 0) + 1;
        } else {
          room.state.turn = playerMark === 'X' ? 'O' : 'X';
        }
      }
    } else if (action === 'REMATCH') {
      room.players[playerId].rematch = true;
      const allRematch = Object.values(room.players).length === 2 && 
        Object.values(room.players).every((p: any) => p.rematch);

      if (allRematch) {
        // Reset game
        room.state = {
          board: Array(9).fill(null),
          turn: 'X',
          winner: null,
          winningLine: null,
          draw: false,
          playersAssigned: room.state.playersAssigned // Keep assignments
        };
        Object.values(room.players).forEach((p: any) => p.rematch = false);
      }
    }
  } else if (room.game === 'rps') {
    if (action === 'CHOICE') {
      const { choice } = payload; // 'rock', 'paper', 'scissors'
      const isP1 = room.state.playersAssigned.p1 === playerId;
      
      if (isP1) {
        room.state.player1Choice = choice;
      } else {
        room.state.player2Choice = choice;
      }

      if (room.state.player1Choice && room.state.player2Choice) {
        // Both chosen, calculate winner
        const c1 = room.state.player1Choice;
        const c2 = room.state.player2Choice;
        
        if (c1 === c2) {
          room.state.winner = 'draw';
        } else if (
          (c1 === 'rock' && c2 === 'scissors') ||
          (c1 === 'paper' && c2 === 'rock') ||
          (c1 === 'scissors' && c2 === 'paper')
        ) {
          room.state.winner = 'player1';
          const p1Id = room.state.playersAssigned.p1;
          if (room.players[p1Id]) room.players[p1Id].score++;
        } else {
          room.state.winner = 'player2';
          const p2Id = room.state.playersAssigned.p2;
          if (room.players[p2Id]) room.players[p2Id].score++;
        }

        // Check series winner (Best of 5)
        const p1Score = room.players[room.state.playersAssigned.p1]?.score || 0;
        const p2Score = room.players[room.state.playersAssigned.p2]?.score || 0;
        
        if (p1Score >= 3) {
          room.state.seriesWinner = 'player1';
        } else if (p2Score >= 3) {
          room.state.seriesWinner = 'player2';
        }
      }
    } else if (action === 'NEXT_ROUND') {
      // Only reset if series not won
      if (!room.state.seriesWinner) {
         room.players[playerId].rematch = true;
         if (Object.values(room.players).length === 2 && Object.values(room.players).every(p => p.rematch)) {
           room.state.round++;
           room.state.player1Choice = null;
           room.state.player2Choice = null;
           room.state.winner = null;
           Object.values(room.players).forEach(p => p.rematch = false);
         }
      }
    } else if (action === 'REMATCH') {
      room.players[playerId].rematch = true;
      const allRematch = Object.values(room.players).length === 2 && 
        Object.values(room.players).every((p: any) => p.rematch);

      if (allRematch) {
        // Reset game series
        room.state = {
          round: 1,
          player1Choice: null,
          player2Choice: null,
          winner: null,
          seriesWinner: null,
          playersAssigned: room.state.playersAssigned
        };
        Object.values(room.players).forEach((p: any) => {
          p.rematch = false;
          p.score = 0;
        });
      }
    }
  }

  broadcast(roomId, { type: 'STATE_UPDATE', state: room });
  return NextResponse.json({ success: true });
}
