import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  updateRoom,
  broadcast,
  serializeRoom,
} from "@/lib/rooms";
import { checkWinner, getBestMove } from "@/lib/ttt-logic";
import { getRPSResult } from "@/lib/rps-logic";
import { TTTState, RPSState, RPSChoice } from "@/types";

// POST /api/rooms/[id]/action
// body: { playerId, action, payload }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { playerId, action, payload } = body as {
    playerId: string;
    action: string;
    payload: Record<string, unknown>;
  };

  const room = getRoom(params.id);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const playerIndex = room.players.findIndex((p) => p?.id === playerId);
  if (playerIndex === -1) return NextResponse.json({ error: "Not a player" }, { status: 403 });

  // ─── TTT Move ─────────────────────────────────────────────────────────────
  if (action === "ttt_move") {
    const state = room.gameState as TTTState;
    const idx = payload.index as number;
    const myMark = playerIndex === 0 ? "X" : "O";

    if (state.winner) return NextResponse.json({ error: "Game over" }, { status: 400 });
    if (state.currentTurn !== myMark) return NextResponse.json({ error: "Not your turn" }, { status: 400 });
    if (state.board[idx]) return NextResponse.json({ error: "Cell taken" }, { status: 400 });

    const newBoard = [...state.board];
    newBoard[idx] = myMark;
    const { winner, line } = checkWinner(newBoard);

    state.board = newBoard;
    state.currentTurn = state.currentTurn === "X" ? "O" : "X";
    state.winner = winner;
    state.winLine = line;

    if (winner === "X") state.scores.X++;
    else if (winner === "O") state.scores.O++;
    else if (winner === "draw") state.scores.draws++;

    room.gameState = state;
    updateRoom(room);
    broadcast(room.id, { type: "game_update", data: { room: serializeRoom(room) } });
    return NextResponse.json({ ok: true });
  }

  // ─── RPS Choose ──────────────────────────────────────────────────────────
  if (action === "rps_choose") {
    const state = room.gameState as RPSState;
    const choice = payload.choice as RPSChoice;

    if (state.phase !== "choosing") return NextResponse.json({ error: "Not choosing phase" }, { status: 400 });
    if (state.currentChoices[playerIndex]) return NextResponse.json({ error: "Already chose" }, { status: 400 });

    const newChoices = [...state.currentChoices] as [RPSChoice, RPSChoice];
    newChoices[playerIndex] = choice;
    state.currentChoices = newChoices;

    // Both chose?
    if (newChoices[0] && newChoices[1]) {
      state.phase = "revealing";
      const result = getRPSResult(newChoices[0], newChoices[1]);
      const round = { choices: newChoices, result };
      state.rounds.push(round);

      if (result === "win") state.scores[0]++;
      else if (result === "lose") state.scores[1]++;

      // Check series end (best of 5 → first to 3)
      if (state.scores[0] >= 3) {
        state.seriesWinner = 0;
        state.phase = "series_over";
      } else if (state.scores[1] >= 3) {
        state.seriesWinner = 1;
        state.phase = "series_over";
      } else {
        // Schedule transition to result then back to choosing
        state.phase = "result";
      }
    }

    room.gameState = state;
    updateRoom(room);
    broadcast(room.id, { type: "game_update", data: { room: serializeRoom(room) } });
    return NextResponse.json({ ok: true });
  }

  // ─── RPS Next Round ───────────────────────────────────────────────────────
  if (action === "rps_next_round") {
    const state = room.gameState as RPSState;
    state.phase = "choosing";
    state.currentChoices = [null, null];
    room.gameState = state;
    updateRoom(room);
    broadcast(room.id, { type: "game_update", data: { room: serializeRoom(room) } });
    return NextResponse.json({ ok: true });
  }

  // ─── TTT Reset ────────────────────────────────────────────────────────────
  if (action === "ttt_reset") {
    const state = room.gameState as TTTState;
    const scores = state.scores;
    room.gameState = {
      board: Array(9).fill(null),
      currentTurn: "X",
      winner: null,
      winLine: null,
      scores,
    } as TTTState;
    room.rematchVotes = [];
    updateRoom(room);
    broadcast(room.id, { type: "game_update", data: { room: serializeRoom(room) } });
    return NextResponse.json({ ok: true });
  }

  // ─── Rematch Vote ─────────────────────────────────────────────────────────
  if (action === "rematch_vote") {
    if (!room.rematchVotes.includes(playerId)) {
      room.rematchVotes.push(playerId);
    }

    const allVoted =
      room.players.filter(Boolean).length === 2 &&
      room.players.every((p) => !p || room.rematchVotes.includes(p.id));

    if (allVoted) {
      // Reset game
      room.rematchVotes = [];
      if (room.gameType === "ttt") {
        const old = room.gameState as TTTState;
        room.gameState = {
          board: Array(9).fill(null),
          currentTurn: "X",
          winner: null,
          winLine: null,
          scores: old.scores,
        } as TTTState;
      } else {
        room.gameState = {
          phase: "choosing",
          rounds: [],
          currentChoices: [null, null],
          scores: [0, 0],
          seriesWinner: null,
        } as RPSState;
      }
      updateRoom(room);
      broadcast(room.id, { type: "rematch_start", data: { room: serializeRoom(room) } });
    } else {
      updateRoom(room);
      broadcast(room.id, {
        type: "rematch_vote",
        data: { playerId, room: serializeRoom(room) },
      });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
