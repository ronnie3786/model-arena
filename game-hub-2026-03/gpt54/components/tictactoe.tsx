"use client";

import { useEffect, useMemo } from "react";
import { ConnectionBadge, GameShell } from "@/components/game-shell";
import { PrimaryButton } from "@/components/ui";
import { useRoom } from "@/hooks/use-room";
import { useSound } from "@/hooks/use-sound";
import { RoomState } from "@/lib/types";
import { cn } from "@/lib/utils";

const lineMap: Record<string, string> = {
  "0,1,2": "top-[16.66%] left-[12%] right-[12%] h-1",
  "3,4,5": "top-1/2 left-[12%] right-[12%] h-1 -translate-y-1/2",
  "6,7,8": "bottom-[16.66%] left-[12%] right-[12%] h-1",
  "0,3,6": "left-[16.66%] top-[12%] bottom-[12%] w-1",
  "1,4,7": "left-1/2 top-[12%] bottom-[12%] w-1 -translate-x-1/2",
  "2,5,8": "right-[16.66%] top-[12%] bottom-[12%] w-1",
  "0,4,8": "left-[15%] right-[15%] top-1/2 h-1 -rotate-45",
  "2,4,6": "left-[15%] right-[15%] top-1/2 h-1 rotate-45",
};

export function TicTacToeGame({ room, playerId }: { room: RoomState; playerId: string }) {
  const { room: liveRoom, connected } = useRoom(room.mode === "friend" ? room.code : undefined, room.mode === "friend" ? playerId : undefined, room);
  const currentRoom = liveRoom ?? room;
  const ttt = currentRoom.ttt!;
  const { playMove, playWin } = useSound();
  const playerIndex = currentRoom.players.findIndex((player) => player.id === playerId);
  const playerSymbol = playerIndex === 0 ? "X" : "O";
  const canMove = !ttt.winner && !ttt.draw && ttt.currentTurn === playerSymbol;

  useEffect(() => {
    if (ttt.winner || ttt.draw) playWin();
  }, [playWin, ttt.draw, ttt.winner]);

  const statusText = useMemo(() => {
    if (ttt.winner) {
      const winnerName = ttt.winner === "X" ? currentRoom.players[0]?.name : currentRoom.players[1]?.name ?? "Opponent";
      return `${winnerName} wins!`;
    }
    if (ttt.draw) return "Draw round";
    const currentName = ttt.currentTurn === "X" ? currentRoom.players[0]?.name : currentRoom.players[1]?.name ?? "Opponent";
    return `${currentName}'s turn`;
  }, [currentRoom.players, ttt.currentTurn, ttt.draw, ttt.winner]);

  const sendAction = async (body: Record<string, unknown>) => {
    const endpoint = currentRoom.mode === "friend" ? `/api/rooms/${currentRoom.code}/action` : `/api/rooms/${currentRoom.code}/action`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (currentRoom.mode === "ai") {
      const data = await response.json();
      sessionStorage.setItem("ttt-ai-state", JSON.stringify(data.room));
      window.location.reload();
    }
  };

  const onClick = async (index: number) => {
    if (!canMove || ttt.board[index]) return;
    playMove();
    await sendAction({ type: "ttt_move", index });
  };

  const onReset = async () => {
    await sendAction({ type: currentRoom.mode === "friend" ? "ttt_reset" : "rematch", playerId });
  };

  return (
    <GameShell title="Tic-Tac-Toe" accent="text-emerald-300">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel relative p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-black sm:text-4xl">{statusText}</h1>
              <p className="mt-2 text-sm text-slate-300">Smooth turns, glowing pieces, and an animated strike-through for every win.</p>
            </div>
            <ConnectionBadge connected={currentRoom.mode === "ai" ? true : connected} />
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div className="grid h-full grid-cols-3 gap-3">
              {ttt.board.map((cell, index) => (
                <button
                  key={index}
                  className="panel-alt relative flex items-center justify-center rounded-[28px] text-4xl font-black sm:text-6xl"
                  onClick={() => onClick(index)}
                  disabled={!canMove || !!cell}
                >
                  {cell ? <span className={cn("animate-fadeScale", cell === "X" ? "text-emerald-300" : "text-cyan-300")}>{cell}</span> : null}
                </button>
              ))}
            </div>
            {ttt.winningLine ? (
              <div className={cn("absolute rounded-full bg-emerald-400 shadow-glowGreen transition-all duration-700", lineMap[ttt.winningLine.join(",")])} />
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Players</p>
            <div className="mt-4 space-y-3">
              {currentRoom.players.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{index === 0 ? "X" : "O"}</p>
                  </div>
                  <span className={cn("h-3 w-3 rounded-full", player.connected ? "bg-emerald-400" : "bg-rose-500")} />
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Score</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ScoreCard label="Player X" value={ttt.score.X} accent="text-emerald-300" />
              <ScoreCard label="Opponent O" value={ttt.score.O} accent="text-cyan-300" />
              <ScoreCard label="Draws" value={ttt.score.draws} accent="text-yellow-300" />
            </div>
            <PrimaryButton className="mt-5 w-full bg-ttt text-slate-950 hover:bg-emerald-300" onClick={onReset}>
              Play Again
            </PrimaryButton>
            {currentRoom.statusMessage ? <p className="mt-3 text-sm text-rose-400">{currentRoom.statusMessage}</p> : null}
          </section>
        </aside>
      </div>
    </GameShell>
  );
}

function ScoreCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={cn("mt-2 text-3xl font-black", accent)}>{value}</p>
    </div>
  );
}
