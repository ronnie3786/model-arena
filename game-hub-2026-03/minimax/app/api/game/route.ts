import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom } from '@/lib/rooms';
import { TTTPlayer, RPSPlayer, determineRPSWinner, GameState } from '@/types';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkTTTWinner(board: (TTTPlayer | null)[]): { winner: TTTPlayer | null; line: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isBoardFull(board: (TTTPlayer | null)[]): boolean {
  return board.every(cell => cell !== null);
}

function getBestMove(board: (TTTPlayer | null)[], player: TTTPlayer): number {
  const available = board.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
  if (available.length === 0) return -1;
  
  const opponent: TTTPlayer = player === 'X' ? 'O' : 'X';
  
  const minimax = (b: (TTTPlayer | null)[], p: TTTPlayer, depth: number): number => {
    const { winner } = checkTTTWinner(b);
    if (winner === player) return 10 - depth;
    if (winner === opponent) return depth - 10;
    if (isBoardFull(b)) return 0;
    
    const moves = b.map((c, i) => c === null ? i : -1).filter(i => i !== -1);
    const scores: number[] = [];
    
    for (const move of moves) {
      const newBoard = [...b];
      newBoard[move] = p;
      scores.push(minimax(newBoard, p === player ? opponent : player, depth + 1));
    }
    
    return p === player ? Math.max(...scores) : Math.min(...scores);
  };
  
  let bestScore = -Infinity;
  let bestMove = available[0];
  
  for (const move of available) {
    const newBoard = [...board];
    newBoard[move] = player;
    const score = minimax(newBoard, opponent, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, playerId, move, rpsChoice, rematchAccepted } = body;

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isPlayer1 = room.player1?.id === playerId;
    const isPlayer2 = room.player2?.id === playerId;
    
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 });
    }

    if (room.game === 'tictactoe') {
      return handleTTTMove(room, isPlayer1, move);
    } else {
      return handleRPSMove(room, isPlayer1, rpsChoice, rematchAccepted);
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function handleTTTMove(room: ReturnType<typeof getRoom>, isPlayer1: boolean, move: number) {
  if (!room || room.state.status !== 'playing') {
    return NextResponse.json({ error: 'Invalid game state' }, { status: 400 });
  }

  const board = [...room.state.board];
  const currentTurn = room.state.turn;
  const playerTurn: TTTPlayer = isPlayer1 ? 'X' : 'O';
  
  if (currentTurn !== playerTurn || board[move] !== null) {
    return NextResponse.json({ error: 'Invalid move' }, { status: 400 });
  }

  board[move] = playerTurn;
  const { winner, line } = checkTTTWinner(board);
  
  let newState: GameState;
  
  if (winner) {
    const scores = { ...room.scores };
    if (isPlayer1) {
      scores.player1++;
    } else {
      scores.player2++;
    }
    newState = {
      status: 'ttt-result',
      winner,
      scores,
      round: room.currentRound,
      board,
      winningLine: line,
    };
  } else if (isBoardFull(board)) {
    const scores = { ...room.scores, draws: room.scores.draws + 1 };
    newState = {
      status: 'ttt-result',
      winner: 'draw',
      scores,
      round: room.currentRound,
      board,
      winningLine: null,
    };
  } else {
    const nextTurn: TTTPlayer = playerTurn === 'X' ? 'O' : 'X';
    newState = {
      status: 'playing',
      board,
      turn: nextTurn,
      winner: null,
      winningLine: null,
    };
  }

  const updated = updateRoom(room.code, { state: newState });
  return NextResponse.json(updated);
}

function handleRPSMove(
  room: ReturnType<typeof getRoom>, 
  isPlayer1: boolean, 
  rpsChoice: RPSPlayer | undefined,
  rematchAccepted: boolean | undefined
) {
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  if (rematchAccepted !== undefined) {
    const rematchRequests = [...room.rematchRequests];
    
    if (rematchAccepted) {
      rematchRequests.push(isPlayer1 ? 'player1' : 'player2');
      
      if (rematchRequests.length === 2) {
        const updated = updateRoom(room.code, {
          state: { status: 'rps-choice' },
          rematchRequests: [],
          currentRound: room.currentRound + 1,
        });
        return NextResponse.json(updated);
      } else {
        const updated = updateRoom(room.code, {
          state: { status: 'rematch-pending' },
          rematchRequests,
        });
        return NextResponse.json(updated);
      }
    } else {
      const updated = updateRoom(room.code, {
        state: { status: 'waiting' },
        rematchRequests: [],
      });
      return NextResponse.json(updated);
    }
  }

  if (room.state.status !== 'rps-choice' && room.state.status !== 'rps-waiting') {
    return NextResponse.json({ error: 'Invalid game state' }, { status: 400 });
  }

  const choice: RPSPlayer = rpsChoice || (isPlayer1 ? 'R' : 'P');

  if (room.state.status === 'rps-choice') {
    if (isPlayer1) {
      const updated = updateRoom(room.code, {
        state: {
          status: 'rps-waiting',
          player1Choice: choice,
        },
      });
      return NextResponse.json(updated);
    } else {
      const player1Choice: RPSPlayer = 'R';
      const result = determineRPSWinner(choice, player1Choice);
      const scores = { ...room.scores };
      
      if (result === 'win') scores.player2++;
      else if (result === 'lose') scores.player1++;
      else scores.draws++;
      
      const bestOf5 = 5;
      const currentRound = room.currentRound;
      let seriesWinner: TTTPlayer | null = null;
      
      if (scores.player1 >= Math.ceil(bestOf5 / 2)) {
        seriesWinner = 'X';
      } else if (scores.player2 >= Math.ceil(bestOf5 / 2)) {
        seriesWinner = 'O';
      }
      
      const updated = updateRoom(room.code, {
        state: {
          status: 'rps-result',
          player1Choice,
          player2Choice: choice,
          result,
          scores,
          round: currentRound,
          bestOf: bestOf5,
          seriesWinner,
        },
      });
      return NextResponse.json(updated);
    }
  }

  if (room.state.status === 'rps-waiting' && !isPlayer1) {
    const player1Choice = room.state.player1Choice;
    const result = determineRPSWinner(choice, player1Choice);
    const scores = { ...room.scores };
    
    if (result === 'win') scores.player2++;
    else if (result === 'lose') scores.player1++;
    else scores.draws++;
    
    const bestOf5 = 5;
    const currentRound = room.currentRound;
    let seriesWinner: TTTPlayer | null = null;
    
    if (scores.player1 >= Math.ceil(bestOf5 / 2)) {
      seriesWinner = 'X';
    } else if (scores.player2 >= Math.ceil(bestOf5 / 2)) {
      seriesWinner = 'O';
    }
    
    const updated = updateRoom(room.code, {
      state: {
        status: 'rps-result',
        player1Choice,
        player2Choice: choice,
        result,
        scores,
        round: currentRound,
        bestOf: bestOf5,
        seriesWinner,
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json(room);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, playerId, action } = body;

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isPlayer1 = room.player1?.id === playerId;
    const isPlayer2 = room.player2?.id === playerId;
    
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Invalid player' }, { status: 400 });
    }

    if (action === 'ai-move') {
      if (room.game !== 'tictactoe' || room.state.status !== 'playing') {
        return NextResponse.json({ error: 'Invalid game state' }, { status: 400 });
      }

      const board: (TTTPlayer | null)[] = [...room.state.board];
      const aiMove = getBestMove(board, 'O');
      
      if (aiMove === -1) return NextResponse.json(room);

      board[aiMove] = 'O';
      const { winner, line } = checkTTTWinner(board);
      
      let newState: GameState;
      
      if (winner) {
        const scores = { ...room.scores, player2: room.scores.player2 + 1 };
        newState = {
          status: 'ttt-result',
          winner,
          scores,
          round: room.currentRound,
          board,
          winningLine: line,
        };
      } else if (isBoardFull(board)) {
        const scores = { ...room.scores, draws: room.scores.draws + 1 };
        newState = {
          status: 'ttt-result',
          winner: 'draw',
          scores,
          round: room.currentRound,
          board,
          winningLine: null,
        };
      } else {
        newState = {
          status: 'playing',
          board,
          turn: 'X',
          winner: null,
          winningLine: null,
        };
      }

      const updated = updateRoom(room.code, { state: newState });
      return NextResponse.json(updated);
    }

    if (action === 'play-again') {
      if (room.game === 'tictactoe') {
        const updated = updateRoom(room.code, {
          state: {
            status: 'playing',
            board: Array(9).fill(null) as (TTTPlayer | null)[],
            turn: 'X',
            winner: null,
            winningLine: null,
          },
          currentRound: room.currentRound + 1,
        });
        return NextResponse.json(updated);
      }
    }

    if (action === 'rps-ai') {
      if (room.game !== 'rockpaperscissors') {
        return NextResponse.json({ error: 'Invalid game' }, { status: 400 });
      }

      const choices: RPSPlayer[] = ['R', 'P', 'S'];
      const playerChoice: RPSPlayer = choices[Math.floor(Math.random() * 3)];
      const aiChoice: RPSPlayer = choices[Math.floor(Math.random() * 3)];
      const result = determineRPSWinner(playerChoice, aiChoice);
      
      const scores = { ...room.scores };
      
      if (result === 'win') scores.player1++;
      else if (result === 'lose') scores.player2++;
      else scores.draws++;
      
      const bestOf5 = 5;
      const currentRound = room.currentRound;
      let seriesWinner: TTTPlayer | null = null;
      
      if (scores.player1 >= Math.ceil(bestOf5 / 2)) {
        seriesWinner = 'X';
      } else if (scores.player2 >= Math.ceil(bestOf5 / 2)) {
        seriesWinner = 'O';
      }

      const updated = updateRoom(room.code, {
        state: {
          status: 'rps-result',
          player1Choice: playerChoice,
          player2Choice: aiChoice,
          result,
          scores,
          round: currentRound,
          bestOf: bestOf5,
          seriesWinner,
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
