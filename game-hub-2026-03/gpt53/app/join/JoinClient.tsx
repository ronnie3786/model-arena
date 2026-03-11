"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function JoinClient(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const code = (params.get("code") ?? "").toUpperCase();
  const [name, setName] = useState("");
  const [game, setGame] = useState<"ttt" | "rps" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    void (async () => {
      const res = await fetch(`/api/rooms/${code}/meta`);
      const data = (await res.json()) as { game?: "ttt" | "rps"; error?: string };
      if (!res.ok || !data.game) {
        setError(data.error ?? "Room not found");
        return;
      }
      setGame(data.game);
    })();
  }, [code]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", code, name })
    });
    const data = (await response.json()) as { playerId?: string; error?: string };
    if (!response.ok || !data.playerId || !game) {
      setError(data.error ?? "Unable to join");
      return;
    }
    router.push(`/${game === "ttt" ? "tictactoe" : "rps"}?mode=multi&code=${code}&playerId=${data.playerId}`);
  };

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-700 bg-black/25 p-6">
      <h1 className="font-display text-3xl font-bold">Join Room</h1>
      <p className="mt-2 text-slate-300">
        Room code: <span className="font-bold tracking-[0.2em] text-cyan-300">{code || "------"}</span>
      </p>
      <form className="mt-6 space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="w-full rounded bg-slate-900 px-3 py-2 ring-1 ring-slate-600 outline-none focus:ring-cyan-400"
          required
        />
        <button type="submit" className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40" disabled={!game}>
          Join {game === "ttt" ? "Tic-Tac-Toe" : game === "rps" ? "Rock Paper Scissors" : "..."}
        </button>
      </form>
      {error ? <p className="mt-3 text-rose-300">{error}</p> : null}
    </div>
  );
}
