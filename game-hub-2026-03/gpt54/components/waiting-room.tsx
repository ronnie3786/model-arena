"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton, Shell } from "@/components/ui";
import { useRoom } from "@/hooks/use-room";
import { RoomState } from "@/lib/types";

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function WaitingRoom({ room, playerId }: { room: RoomState; playerId: string }) {
  const router = useRouter();
  const { room: liveRoom, countdownMs, connected } = useRoom(room.code, playerId, room);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const currentRoom = liveRoom ?? room;
  const shareLink = useMemo(() => (typeof window === "undefined" ? `/join/${currentRoom.code}` : `${window.location.origin}/join/${currentRoom.code}`), [currentRoom.code]);

  useEffect(() => {
    if (currentRoom.started) {
      router.push(`/room/${currentRoom.code}/play?playerId=${playerId}`);
    }
  }, [currentRoom.code, currentRoom.started, playerId, router]);

  const remaining = currentRoom.started ? 0 : Math.max(0, currentRoom.expiresAt - now);

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center py-10">
        <section className="panel w-full space-y-8 p-6 text-center shadow-glowGreen sm:p-10">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-400">Waiting for challenger</p>
            <h1 className="font-display text-4xl font-black sm:text-6xl">{currentRoom.code}</h1>
            <p className="text-sm text-slate-300 sm:text-base">Share the room code or link. The game starts the moment your friend joins.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel-alt p-5 text-left">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Shareable link</p>
              <p className="mt-3 break-all text-sm text-white">{shareLink}</p>
              <PrimaryButton
                className="mt-4 w-full bg-ttt text-slate-950 hover:bg-emerald-300"
                onClick={async () => navigator.clipboard.writeText(shareLink)}
              >
                Copy Link
              </PrimaryButton>
            </div>
            <div className="panel-alt flex flex-col justify-between p-5 text-left">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Room expires in</p>
                <p className="mt-3 text-3xl font-black text-warn">{formatTime(remaining || countdownMs)}</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <span className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-400" : "bg-rose-500"}`} />
                {connected ? "Connected" : "Reconnecting..."}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-white/10 px-5 py-4 text-sm text-slate-300">
            Joined as <span className="font-bold text-white">{currentRoom.players[0]?.name}</span>. Send the link or ask your friend to enter the code on the join screen.
          </div>

          <Link className="inline-flex text-sm text-slate-300 hover:text-white" href="/">
            Back to lobby
          </Link>
        </section>
      </div>
    </Shell>
  );
}
