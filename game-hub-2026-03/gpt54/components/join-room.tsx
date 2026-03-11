"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, Shell } from "@/components/ui";

export function JoinRoom({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("Player 2");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const response = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not join room");
      return;
    }
    const player = data.room.players[data.room.players.length - 1];
    router.push(`/room/${data.room.code}/play?playerId=${player.id}`);
  };

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center py-10">
        <form onSubmit={onSubmit} className="panel w-full space-y-6 p-6 sm:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Join a room</p>
            <h1 className="mt-3 font-display text-4xl font-black">Enter the code and jump in.</h1>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Your name</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 outline-none ring-0"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={18}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Room code</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-center text-3xl font-black uppercase tracking-[0.4em] outline-none"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
            />
          </label>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <PrimaryButton className="w-full bg-white text-slate-950 hover:bg-slate-200" type="submit">
            Join Game
          </PrimaryButton>
        </form>
      </div>
    </Shell>
  );
}
