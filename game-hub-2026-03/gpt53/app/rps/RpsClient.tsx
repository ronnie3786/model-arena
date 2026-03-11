"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { moveSfx, winSfx } from "@/lib/client/audio";
import { Choice, RoomSnapshot } from "@/lib/types";

const OPTIONS: Array<{ label: string; emoji: string; value: Choice }> = [
  { label: "Rock", emoji: "✊", value: "rock" },
  { label: "Paper", emoji: "✋", value: "paper" },
  { label: "Scissors", emoji: "✌️", value: "scissors" }
];

function randomChoice(): Choice {
  return OPTIONS[Math.floor(Math.random() * OPTIONS.length)].value;
}

function decide(a: Choice, b: Choice): "win" | "lose" | "draw" {
  if (a === b) return "draw";
  if ((a === "rock" && b === "scissors") || (a === "paper" && b === "rock") || (a === "scissors" && b === "paper")) return "win";
  return "lose";
}

export default function RpsClient(): React.JSX.Element {
  const params = useSearchParams();
  const mode = params.get("mode") ?? "ai";
  const code = (params.get("code") ?? "").toUpperCase();
  const initialPlayerId = params.get("playerId") ?? "";

  const [playerId, setPlayerId] = useState(initialPlayerId);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [reveal, setReveal] = useState(false);

  const [round, setRound] = useState(1);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [myPick, setMyPick] = useState<Choice | null>(null);
  const [aiPick, setAiPick] = useState<Choice | null>(null);
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);

  useEffect(() => {
    if (mode !== "multi" || !code || !playerId) return;
    const source = new EventSource(`/api/rooms/${code}/events?playerId=${playerId}`);
    source.onmessage = (event) => {
      const snapshot = JSON.parse(event.data) as RoomSnapshot;
      setRoom(snapshot);
    };
    source.onerror = () => setError("Connection lost. Trying to reconnect...");
    return () => source.close();
  }, [mode, code, playerId]);

  useEffect(() => {
    if (mode !== "multi" || !room?.rps?.bothChosen) {
      setReveal(false);
      setCountdown(3);
      return;
    }
    setReveal(false);
    setCountdown(3);
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setReveal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 450);
    return () => window.clearInterval(timer);
  }, [room?.rps?.bothChosen, mode]);

  const me = useMemo(() => room?.players.find((p) => p.id === playerId), [room, playerId]);
  const opponent = useMemo(() => room?.players.find((p) => p.id !== playerId), [room, playerId]);

  const playAi = (choice: Choice): void => {
    if (result && (wins >= 3 || losses >= 3 || round > 5)) return;
    const ai = randomChoice();
    const r = decide(choice, ai);
    setMyPick(choice);
    setAiPick(ai);
    setResult(r);
    moveSfx();
    if (r === "win") {
      setWins((prev) => prev + 1);
      winSfx();
    }
    if (r === "lose") setLosses((prev) => prev + 1);
  };

  const nextAiRound = (): void => {
    setRound((prev) => prev + 1);
    setMyPick(null);
    setAiPick(null);
    setResult(null);
  };

  const resetAiSeries = (): void => {
    setRound(1);
    setWins(0);
    setLosses(0);
    setMyPick(null);
    setAiPick(null);
    setResult(null);
  };

  const joinFromGame = async (): Promise<void> => {
    const name = window.prompt("Enter your name")?.trim();
    if (!name) return;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", code, name })
    });
    const data = (await res.json()) as { playerId?: string; error?: string };
    if (!res.ok || !data.playerId) {
      setError(data.error ?? "Unable to join");
      return;
    }
    setPlayerId(data.playerId);
  };

  const aiOver = wins >= 3 || losses >= 3 || round >= 5;

  const aiUi = (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">Best of 5 - Round {round}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => playAi(option.value)}
            className="card-glow rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 p-5 text-center"
          >
            <div className="text-5xl">{option.emoji}</div>
            <div className="mt-2 font-semibold">{option.label}</div>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-black/20 p-4">
        <p>Wins: {wins} | Losses: {losses}</p>
        {myPick && aiPick ? (
          <p className={`mt-2 font-bold ${result === "win" ? "text-green-400" : result === "lose" ? "text-rose-400" : "text-yellow-300"}`}>
            You picked {myPick}, AI picked {aiPick}. {result === "win" ? "You Win!" : result === "lose" ? "You Lose!" : "Draw!"}
          </p>
        ) : null}
      </div>

      {myPick && !aiOver ? (
        <button className="rounded bg-fuchsia-500 px-4 py-2 font-semibold" onClick={nextAiRound}>
          Next Round
        </button>
      ) : null}

      {aiOver ? (
        <div className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-600/10 p-4">
          <p className="text-xl font-bold">{wins === losses ? "Series Draw" : wins > losses ? "You Won the Series" : "AI Won the Series"}</p>
          <button className="mt-3 rounded bg-fuchsia-500 px-4 py-2 font-semibold" onClick={resetAiSeries}>
            Rematch
          </button>
        </div>
      ) : null}
    </div>
  );

  const multiUi = (() => {
    if (!playerId) {
      return (
        <div className="rounded-xl border border-slate-700 bg-black/20 p-5">
          <p className="mb-4">Join this Rock Paper Scissors room.</p>
          <button className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-900" onClick={() => void joinFromGame()}>
            Enter Name & Join
          </button>
        </div>
      );
    }

    if (!room) return <p>Connecting...</p>;
    if (room.status === "waiting") {
      const seconds = Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000));
      return (
        <div className="rounded-xl border border-fuchsia-400/35 bg-black/20 p-5 text-center">
          <p>Waiting for opponent...</p>
          <p className="mt-2 text-4xl font-bold tracking-[0.2em] text-fuchsia-300">{room.code}</p>
          <p className="mt-2 text-slate-300">Expires in {seconds}s</p>
        </div>
      );
    }

    const rps = room.rps;
    if (!rps) return null;
    const myWins = rps.wins[playerId] ?? 0;
    const oppWins = rps.wins[opponent?.id ?? ""] ?? 0;
    const myChoice = rps.choices[playerId];
    const oppChoice = opponent ? rps.choices[opponent.id] : null;
    const roundResult = rps.roundWinner === "draw" ? "draw" : rps.roundWinner === playerId ? "win" : rps.roundWinner ? "lose" : null;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span>
              {me?.name} vs {opponent?.name ?? "Waiting"}
            </span>
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${opponent?.connected ? "bg-green-400" : "bg-slate-500"}`} />
              {opponent?.connected ? "Connected" : "Opponent disconnected"}
            </span>
          </div>
          <div className="mt-2">
            Round {rps.round} / {rps.bestOf} - {myWins} : {oppWins}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                void fetch(`/api/rooms/${code}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId, action: { type: "rps_pick", choice: option.value } })
                })
              }
              className="card-glow rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 p-5"
              disabled={Boolean(myChoice) || Boolean(rps.seriesWinner)}
            >
              <div className="text-5xl">{option.emoji}</div>
              <div className="mt-2">{option.label}</div>
            </button>
          ))}
        </div>

        {rps.bothChosen && !reveal ? <p className="text-center text-4xl font-bold text-fuchsia-300">{countdown || "GO"}</p> : null}

        {reveal && rps.bothChosen ? (
          <div className="rounded-xl border border-fuchsia-300/40 bg-black/25 p-4 text-center">
            <p className="text-lg">You: {myChoice} | Opponent: {oppChoice}</p>
            <p className={`mt-2 text-2xl font-bold ${roundResult === "win" ? "text-green-400" : roundResult === "lose" ? "text-rose-400" : "text-yellow-300"}`}>
              {roundResult === "win" ? "You Win!" : roundResult === "lose" ? "You Lose!" : "Draw!"}
            </p>
            {!rps.seriesWinner ? (
              <button
                className="mt-3 rounded bg-fuchsia-500 px-4 py-2 font-semibold"
                onClick={() =>
                  void fetch(`/api/rooms/${code}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ playerId, action: { type: "rps_next_round" } })
                  })
                }
              >
                Next Round
              </button>
            ) : null}
          </div>
        ) : null}

        {rps.seriesWinner ? (
          <div className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-600/10 p-4 text-center">
            <p className="text-2xl font-bold">
              {rps.seriesWinner === "draw" ? "Series Draw" : rps.seriesWinner === playerId ? "You won the series" : "You lost the series"}
            </p>
            <button
              className="mt-3 rounded bg-fuchsia-500 px-4 py-2 font-semibold"
              onClick={() =>
                void fetch(`/api/rooms/${code}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId, action: { type: "rematch" } })
                })
              }
            >
              Rematch ({room.players.filter((p) => p.rematchAccepted).length}/2)
            </button>
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-rps">Rock Paper Scissors</h1>
        <Link href="/" className="rounded border border-slate-600 px-3 py-1 text-sm">
          Back to Lobby
        </Link>
      </header>
      {mode === "multi" ? multiUi : aiUi}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
