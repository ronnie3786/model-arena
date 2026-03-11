"use client";

import { useRouter } from "next/navigation";
import { PrimaryButton, SectionTitle, Shell } from "@/components/ui";
import { GameType } from "@/lib/types";

const games = [
  {
    key: "tictactoe" as GameType,
    title: "Tic-Tac-Toe",
    accent: "from-emerald-400/30 via-emerald-500/20 to-transparent",
    ring: "shadow-glowGreen",
    graphic: ["X", "O", "X", "O"],
    description: "Unbeatable AI, animated win lines, and quick-fire rematches.",
  },
  {
    key: "rps" as GameType,
    title: "Rock Paper Scissors",
    accent: "from-fuchsia-400/30 via-violet-500/20 to-transparent",
    ring: "shadow-glowPurple",
    graphic: ["ROCK", "PAPER", "SCISSORS"],
    description: "Simultaneous picks, dramatic reveals, and best-of-five duels.",
  },
];

export function LandingPage() {
  const router = useRouter();

  const startAI = (game: GameType) => {
    const name = window.prompt("Enter your name", "You")?.trim() || "You";
    router.push(`/play/${game}?mode=ai&name=${encodeURIComponent(name)}`);
  };

  const startFriend = async (game: GameType) => {
    const name = window.prompt("Enter your name", "Player 1")?.trim() || "Player 1";
    const response = await fetch("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, name }),
    });
    const data = await response.json();
    router.push(`/room/${data.room.code}?playerId=${data.room.players[0].id}`);
  };

  return (
    <Shell>
      <div className="flex flex-1 flex-col gap-8 py-4 sm:gap-10 sm:py-10">
        <SectionTitle
          title="Two games. One neon-lit multiplayer hub."
          subtitle="Spin up a private room in seconds, challenge an unbeatable bot, or send a link to a friend and watch the action sync live across tabs."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {games.map((game, index) => (
            <article
              key={game.key}
              className={`panel relative overflow-hidden p-6 animate-riseIn ${game.ring}`}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
              <div className="relative flex h-full flex-col gap-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-300">Game Mode</p>
                    <h2 className="mt-3 font-display text-3xl font-black">{game.title}</h2>
                    <p className="mt-3 max-w-md text-sm text-slate-200/80">{game.description}</p>
                  </div>
                  <div className="grid min-w-[120px] gap-2 rounded-3xl border border-white/10 bg-slate-950/30 p-3 text-center text-xs font-black uppercase tracking-[0.24em] text-white/80">
                    {game.graphic.map((item) => (
                      <span key={item} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto grid gap-3 sm:grid-cols-2">
                  <PrimaryButton className="bg-white text-slate-950 hover:scale-[1.01]" onClick={() => startAI(game.key)}>
                    Play vs AI
                  </PrimaryButton>
                  <PrimaryButton
                    className={game.key === "tictactoe" ? "bg-ttt hover:bg-emerald-400" : "bg-rps hover:bg-fuchsia-500"}
                    onClick={() => startFriend(game.key)}
                  >
                    Play with a Friend
                  </PrimaryButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
}
