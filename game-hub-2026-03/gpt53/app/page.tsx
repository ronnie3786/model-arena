"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GameKind } from "@/lib/types";

export default function HomePage(): React.JSX.Element {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const createFriendRoom = async (game: GameKind): Promise<void> => {
    const name = window.prompt("Enter your name")?.trim();
    if (!name) return;

    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", game, name })
    });

    const data = (await response.json()) as { code?: string; playerId?: string; error?: string };
    if (!response.ok || !data.code || !data.playerId) {
      setError(data.error ?? "Failed to create room");
      return;
    }
    router.push(`/${game === "ttt" ? "tictactoe" : "rps"}?mode=multi&code=${data.code}&playerId=${data.playerId}`);
  };

  const onJoin = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    const code = joinCode.trim().toUpperCase();
    router.push(`/join?code=${code}`);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Realtime Party Arena</p>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Multiplayer Game Hub</h1>
        <p className="text-slate-300">Choose a game, play against AI, or invite a friend in real time.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="card-glow rounded-2xl border border-emerald-400/30 bg-panel p-5 shadow-lg shadow-emerald-500/10">
          <div className="mb-4 h-40 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-100/5 p-4">
            <div className="grid h-full grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="grid place-items-center rounded bg-black/20 text-xl font-bold text-emerald-200">
                  {idx % 3 === 0 ? "X" : idx % 3 === 1 ? "O" : ""}
                </div>
              ))}
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold text-ttt">Tic-Tac-Toe</h2>
          <p className="mb-4 mt-2 text-sm text-slate-300">Unbeatable AI and real-time multiplayer rounds.</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/tictactoe?mode=ai" className="rounded-lg bg-emerald-500 px-3 py-2 text-center font-semibold text-slate-950">
              Play vs AI
            </Link>
            <button className="rounded-lg border border-emerald-300/50 px-3 py-2 font-semibold" onClick={() => void createFriendRoom("ttt")}>
              Play with a Friend
            </button>
          </div>
        </article>

        <article className="card-glow rounded-2xl border border-fuchsia-400/30 bg-panel p-5 shadow-lg shadow-fuchsia-500/10">
          <div className="mb-4 h-40 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-indigo-200/5 p-4">
            <div className="grid h-full place-items-center text-5xl">✊ ✋ ✌️</div>
          </div>
          <h2 className="font-display text-2xl font-bold text-rps">Rock Paper Scissors</h2>
          <p className="mb-4 mt-2 text-sm text-slate-300">Simultaneous picks, dramatic reveal, best-of-five showdown.</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/rps?mode=ai" className="rounded-lg bg-fuchsia-500 px-3 py-2 text-center font-semibold text-white">
              Play vs AI
            </Link>
            <button className="rounded-lg border border-fuchsia-300/50 px-3 py-2 font-semibold" onClick={() => void createFriendRoom("rps")}>
              Play with a Friend
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-700 bg-black/20 p-4">
        <form className="flex flex-wrap items-center gap-3" onSubmit={onJoin}>
          <label className="text-sm text-slate-300" htmlFor="join-code">
            Join with room code
          </label>
          <input
            id="join-code"
            maxLength={6}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            className="rounded bg-slate-900 px-3 py-2 uppercase tracking-[0.2em] outline-none ring-1 ring-slate-600 focus:ring-cyan-400"
            placeholder="ABC123"
          />
          <button className="rounded bg-cyan-500 px-3 py-2 font-semibold text-slate-950" type="submit">
            Join Room
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      </section>
    </div>
  );
}
