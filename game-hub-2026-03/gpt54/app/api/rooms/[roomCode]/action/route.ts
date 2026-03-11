import { applyTTTMove, getBestAIMove, resetTTTRound } from "@/lib/game-logic";
import { emit, getRoom, nextRPSRound, playRPS, requestRematch } from "@/lib/rooms";
import { toJson } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: { roomCode: string } }) {
  const body = await request.json();
  const room = getRoom(params.roomCode);
  if (!room) return toJson({ error: "Room not found" }, { status: 404 });

  if (body.type === "ttt_move") {
    applyTTTMove(room, body.index);
    emit(room.code, "ttt_move");
    if (room.mode === "ai" && room.ttt && !room.ttt.winner && !room.ttt.draw && room.ttt.currentTurn === "O") {
      const aiMove = getBestAIMove([...room.ttt.board]);
      if (aiMove >= 0) {
        applyTTTMove(room, aiMove);
        emit(room.code, "ttt_ai_move");
      }
    }
  }

  if (body.type === "ttt_reset") {
    resetTTTRound(room);
    emit(room.code, "ttt_reset");
  }

  if (body.type === "rps_pick") {
    playRPS(room, body.playerId, body.choice);
    emit(room.code, "rps_pick");
  }

  if (body.type === "rps_next_round") {
    nextRPSRound(room);
    emit(room.code, "rps_next_round");
  }

  if (body.type === "rematch") {
    requestRematch(room.code, body.playerId);
  }

  return toJson({ room: getRoom(params.roomCode) });
}
