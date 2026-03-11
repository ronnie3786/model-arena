"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { TicTacToeGame } from "@/components/tictactoe";
import { RockPaperScissorsGame } from "@/components/rps";
import { makeAIRPSState, makeAITTTState } from "@/lib/rooms";
import { RoomState } from "@/lib/types";

export default function AIPlayPage({
  params,
  searchParams,
}: {
  params: { game: string };
  searchParams: { mode?: string; name?: string };
}) {
  if (searchParams.mode !== "ai") notFound();
  const name = searchParams.name || "You";
  const [storedState, setStoredState] = useState<RoomState | null>(null);

  useEffect(() => {
    if (params.game === "rps") {
      const raw = sessionStorage.getItem("rps-ai-state");
      if (raw) setStoredState(JSON.parse(raw));
    }
    if (params.game === "tictactoe") {
      const raw = sessionStorage.getItem("ttt-ai-state");
      if (raw) setStoredState(JSON.parse(raw));
    }
  }, [params.game]);

  const room = useMemo(() => {
    if (params.game === "tictactoe") return storedState ?? makeAITTTState(name);
    return storedState ?? makeAIRPSState(name);
  }, [name, params.game, storedState]);

  if (params.game === "tictactoe") {
    return <TicTacToeGame room={room} playerId="human" />;
  }

  if (params.game === "rps") {
    return <RockPaperScissorsGame room={room} playerId="human" />;
  }

  notFound();
}
