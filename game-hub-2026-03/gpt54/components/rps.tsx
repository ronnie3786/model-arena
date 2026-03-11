"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectionBadge, GameShell } from "@/components/game-shell";
import { PrimaryButton } from "@/components/ui";
import { useRoom } from "@/hooks/use-room";
import { useSound } from "@/hooks/use-sound";
import { RPSChoice, RoomState } from "@/lib/types";
import { cn } from "@/lib/utils";

const options: Array<{ key: RPSChoice; icon: string; label: string }> = [
  { key: "rock", icon: "FIST", label: "Rock" },
  { key: "paper", icon: "PALM", label: "Paper" },
  { key: "scissors", icon: "SNIP", label: "Scissors" },
];

function resultToneClass(room: RoomState, playerId: string) {
  if (!room.rps?.roundResultText) return "text-slate-200";
  if (!room.rps.roundWinner) return "text-yellow-300";
  return room.rps.roundWinner === playerId ? "text-emerald-300" : "text-rose-300";
}

export function RockPaperScissorsGame({ room, playerId }: { room: RoomState; playerId: string }) {
  const { room: liveRoom, connected } = useRoom(room.mode === "friend" ? room.code : undefined, room.mode === "friend" ? playerId : undefined, room);
  const currentRoom = liveRoom ?? room;
  const state = currentRoom.rps!;
  const { playMove, playReveal, playWin } = useSound();
  const [countdown, setCountdown] = useState<number | null>(null);
  const myChoice = state.choices[playerId] ?? null;
  const opponent = currentRoom.players.find((player) => player.id !== playerId);

  useEffect(() => {
    if (!state.revealPhase) return;
    let tick = 3;
    setCountdown(tick);
    const interval = window.setInterval(() => {
      tick -= 1;
      if (tick > 0) {
        playReveal();
        setCountdown(tick);
        return;
      }
      setCountdown(0);
      playWin();
      window.clearInterval(interval);
    }, 700);
    return () => window.clearInterval(interval);
  }, [playReveal, playWin, state.revealPhase, state.score.round]);

  const seriesText = useMemo(() => {
    if (!state.score.seriesWinner) return `Best of 5 - Round ${Math.min(state.score.round, 5)}`;
    return state.score.seriesWinner === playerId ? "You won the series!" : `${opponent?.name ?? "Opponent"} won the series`;
  }, [opponent?.name, playerId, state.score.round, state.score.seriesWinner]);

  const sendAction = async (body: Record<string, unknown>) => {
    if (currentRoom.mode === "ai") return;
    await fetch(`/api/rooms/${currentRoom.code}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const choose = async (choice: RPSChoice) => {
    if (myChoice || state.score.seriesWinner) return;
    playMove();
    if (currentRoom.mode === "friend") {
      await sendAction({ type: "rps_pick", playerId, choice });
      return;
    }

    const aiChoices: RPSChoice[] = ["rock", "paper", "scissors"];
    const aiChoice = aiChoices[Math.floor(Math.random() * aiChoices.length)];
    const local = structuredClone(currentRoom);
    local.rps!.choices[playerId] = choice;
    local.rps!.choices.ai = aiChoice;
    local.rps!.revealedChoices = { ...local.rps!.choices };
    local.rps!.revealPhase = true;
    const humanWins =
      (choice === "rock" && aiChoice === "scissors") ||
      (choice === "paper" && aiChoice === "rock") ||
      (choice === "scissors" && aiChoice === "paper");
    if (choice === aiChoice) {
      local.rps!.roundResultText = "Draw!";
      local.rps!.score.draws += 1;
    } else if (humanWins) {
      local.rps!.roundResultText = "You Win!";
      local.rps!.roundWinner = playerId;
      local.rps!.score.player1 += 1;
    } else {
      local.rps!.roundResultText = "You Lose!";
      local.rps!.roundWinner = "ai";
      local.rps!.score.player2 += 1;
    }
    if (local.rps!.score.player1 >= 3) local.rps!.score.seriesWinner = playerId;
    if (local.rps!.score.player2 >= 3) local.rps!.score.seriesWinner = "ai";
    if (!local.rps!.score.seriesWinner) local.rps!.score.round += 1;
    sessionStorage.setItem("rps-ai-state", JSON.stringify(local));
    window.location.reload();
  };

  const nextRound = async () => {
    if (currentRoom.mode === "friend") {
      await sendAction({ type: "rps_next_round" });
      return;
    }
    sessionStorage.removeItem("rps-ai-state");
    window.location.reload();
  };

  const requestRematch = async () => {
    if (currentRoom.mode === "friend") {
      await fetch(`/api/rooms/${currentRoom.code}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      return;
    }
    sessionStorage.removeItem("rps-ai-state");
    window.location.reload();
  };

  return (
    <GameShell title="Rock Paper Scissors" accent="text-fuchsia-300">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-black sm:text-4xl">{seriesText}</h1>
              <p className="mt-2 text-sm text-slate-300">Pick in secret, watch the countdown, then reveal everything at once.</p>
            </div>
            <ConnectionBadge connected={currentRoom.mode === "ai" ? true : connected} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => choose(option.key)}
                disabled={!!myChoice || !!state.score.seriesWinner}
                className={cn(
                  "group rounded-[28px] border border-white/10 bg-white/5 px-4 py-8 text-center hover:-translate-y-1 hover:border-fuchsia-300/40 hover:bg-fuchsia-400/10",
                  myChoice === option.key && "border-fuchsia-300 bg-fuchsia-500/20 shadow-glowPurple",
                )}
              >
                <div className="text-xs font-black uppercase tracking-[0.34em] text-slate-400">{option.icon}</div>
                <div className="mt-4 text-2xl font-black text-white">{option.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RevealCard title="You" choice={countdown === 0 ? state.revealedChoices[playerId] : myChoice} reveal={countdown === 0 || currentRoom.mode === "ai"} />
            <RevealCard
              title={opponent?.name ?? "Opponent"}
              choice={countdown === 0 ? state.revealedChoices[opponent?.id ?? "ai"] : null}
              reveal={countdown === 0}
            />
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-center">
            {state.revealPhase && countdown !== 0 ? <p className="text-6xl font-black text-fuchsia-300">{countdown}</p> : null}
            <p className={cn("text-2xl font-black", resultToneClass(currentRoom, playerId))}>{state.roundResultText || (myChoice ? "Locked in. Waiting for reveal..." : "Choose your move")}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {!state.score.seriesWinner && state.revealPhase ? (
                <PrimaryButton className="bg-rps hover:bg-fuchsia-500" onClick={nextRound}>
                  Next Round
                </PrimaryButton>
              ) : null}
              {state.score.seriesWinner ? (
                <PrimaryButton className="bg-white text-slate-950 hover:bg-slate-200" onClick={requestRematch}>
                  Rematch
                </PrimaryButton>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Series progress</p>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const active = index < state.score.player1 + state.score.player2 + state.score.draws;
                return <div key={index} className={cn("h-3 flex-1 rounded-full", active ? "bg-fuchsia-400" : "bg-white/10")} />;
              })}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label={currentRoom.players[0]?.name ?? "You"} value={state.score.player1} accent="text-fuchsia-300" />
              <Stat label={opponent?.name ?? "Opponent"} value={state.score.player2} accent="text-cyan-300" />
              <Stat label="Draws" value={state.score.draws} accent="text-yellow-300" />
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Players</p>
            <div className="mt-4 space-y-3">
              {currentRoom.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{player.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Ready for simultaneous reveal</p>
                  </div>
                  <span className={cn("h-3 w-3 rounded-full", player.connected ? "bg-emerald-400" : "bg-rose-500")} />
                </div>
              ))}
            </div>
            {currentRoom.statusMessage ? <p className="mt-4 text-sm text-rose-400">{currentRoom.statusMessage}</p> : null}
          </section>
        </aside>
      </div>
    </GameShell>
  );
}

function RevealCard({ title, choice, reveal }: { title: string; choice: RPSChoice | null; reveal: boolean }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className={cn("mt-5 rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-8 text-3xl font-black", reveal && "animate-revealFlip")}>{reveal ? choice?.toUpperCase() ?? "-" : "???"}</div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={cn("mt-2 text-3xl font-black", accent)}>{value}</p>
    </div>
  );
}
