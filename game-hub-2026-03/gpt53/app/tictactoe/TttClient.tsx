"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useState } from "react";
import { moveSfx, winSfx } from "@/lib/client/audio";
import { bestMove, evaluateBoard } from "@/lib/client/tttAi";
import { RoomSnapshot } from "@/lib/types";

type Cell = "X" | "O" | null;

function winLineStyle(line: number[] | null): CSSProperties {
  const common: CSSProperties = { width: "94%", left: "3%" };
  if (!line) return { display: "none" };
  const map: Record<string, CSSProperties> = {
    "0,1,2": { ...common, top: "16.6%" },
    "3,4,5": { ...common, top: "50%" },
    "6,7,8": { ...common, top: "83.3%" },
    "0,3,6": { width: "94%", left: "-30%", top: "50%", transform: "rotate(90deg)" },
    "1,4,7": { width: "94%", left: "3%", top: "50%", transform: "rotate(90deg)" },
    "2,5,8": { width: "94%", left: "36%", top: "50%", transform: "rotate(90deg)" },
    "0,4,8": { width: "132%", left: "-16%", top: "50%", transform: "rotate(45deg)" },
    "2,4,6": { width: "132%", left: "-16%", top: "50%", transform: "rotate(-45deg)" }
  };
  return map[line.join(",")] ?? { display: "none" };
}

export default function TttClient(): React.JSX.Element {
  const params = useSearchParams();
  const mode = params.get("mode") ?? "ai";
  const code = (params.get("code") ?? "").toUpperCase();
  const initialPlayerId = params.get("playerId") ?? "";

  const [playerId, setPlayerId] = useState(initialPlayerId);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [board, setBoard] = useState<Cell[]>(Array.from({ length: 9 }, () => null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<"X" | "O" | "draw" | null>(null);
  const [line, setLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });

  useEffect(() => {
    if (mode !== "multi" || !code || !playerId) return;
    const source = new EventSource(`/api/rooms/${code}/events?playerId=${playerId}`);
    source.onmessage = (event) => {
      const snapshot = JSON.parse(event.data) as RoomSnapshot;
      setRoom(snapshot);
    };
    source.onerror = () => {
      setError("Connection lost. Trying to reconnect...");
    };

    return () => {
      source.close();
    };
  }, [mode, code, playerId]);

  useEffect(() => {
    if (mode !== "ai" || turn !== "O" || winner) return;
    const id = window.setTimeout(() => {
      const next = bestMove([...board]);
      if (next >= 0) {
        const nextBoard = [...board];
        nextBoard[next] = "O";
        moveSfx();
        const result = evaluateBoard(nextBoard);
        setBoard(nextBoard);
        setWinner(result.winner);
        setLine(result.line);
        if (result.winner === "O") {
          setScores((prev) => ({ ...prev, ai: prev.ai + 1 }));
          winSfx();
        } else if (result.winner === "draw") {
          setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
        } else {
          setTurn("X");
        }
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [board, turn, winner, mode]);

  const me = useMemo(() => room?.players.find((p) => p.id === playerId), [room, playerId]);
  const opponent = useMemo(() => room?.players.find((p) => p.id !== playerId), [room, playerId]);
  const mySymbol = room?.players[0]?.id === playerId ? "X" : "O";

  const playMoveAi = (index: number): void => {
    if (board[index] || winner || turn !== "X") return;
    const next = [...board];
    next[index] = "X";
    moveSfx();
    const result = evaluateBoard(next);
    setBoard(next);
    setWinner(result.winner);
    setLine(result.line);
    if (result.winner === "X") {
      setScores((prev) => ({ ...prev, player: prev.player + 1 }));
      winSfx();
    } else if (result.winner === "draw") {
      setScores((prev) => ({ ...prev, draws: prev.draws + 1 }));
    } else {
      setTurn("O");
    }
  };

  const playMoveMulti = async (index: number): Promise<void> => {
    if (!room || !playerId) return;
    await fetch(`/api/rooms/${code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, action: { type: "ttt_move", index } })
    });
    moveSfx();
  };

  const copyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
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

  const aiBoard = (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-400/35 bg-black/25 p-4">
        <div className="mb-2 text-sm text-slate-300">Turn: {turn === "X" ? "You" : "AI"}</div>
        <div className="relative mx-auto grid max-w-sm grid-cols-3 gap-2">
          {board.map((cell, index) => (
            <button
              key={index}
              className="aspect-square rounded-lg bg-emerald-950/30 text-4xl font-bold text-emerald-200 ring-1 ring-emerald-300/25"
              onClick={() => playMoveAi(index)}
            >
              <span className="piece-fade">{cell}</span>
            </button>
          ))}
          {line ? <div className="draw-line" style={winLineStyle(line)} /> : null}
        </div>
      </div>
      <div className="rounded-xl border border-slate-700 bg-black/20 p-3 text-sm">
        Player: {scores.player} | Opponent: {scores.ai} | Draws: {scores.draws}
      </div>
      {winner ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-black/20 p-3">
          <p>{winner === "draw" ? "Draw round" : winner === "X" ? "You win" : "AI wins"}</p>
          <button
            className="rounded bg-emerald-400 px-3 py-1 font-semibold text-slate-900"
            onClick={() => {
              setBoard(Array.from({ length: 9 }, () => null));
              setTurn("X");
              setWinner(null);
              setLine(null);
            }}
          >
            Play Again
          </button>
        </div>
      ) : null}
    </div>
  );

  const multiplayerUi = (() => {
    if (!playerId) {
      return (
        <div className="rounded-xl border border-slate-700 bg-black/20 p-5">
          <p className="mb-4">Join this Tic-Tac-Toe room.</p>
          <button className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-900" onClick={() => void joinFromGame()}>
            Enter Name & Join
          </button>
        </div>
      );
    }

    if (!room) return <p>Connecting...</p>;

    if (room.status === "expired") {
      return <p className="text-rose-300">Room expired before another player joined.</p>;
    }

    if (room.status === "waiting") {
      const seconds = Math.max(0, Math.ceil((room.expiresAt - Date.now()) / 1000));
      return (
        <div className="rounded-xl border border-emerald-400/35 bg-black/20 p-5 text-center">
          <p className="text-sm text-slate-300">Waiting for opponent...</p>
          <p className="mt-2 text-4xl font-bold tracking-[0.2em] text-emerald-200">{room.code}</p>
          <p className="mt-2 text-slate-300">Expires in {seconds}s</p>
          <button className="mt-4 rounded bg-emerald-400 px-3 py-2 font-semibold text-slate-900" onClick={() => void copyLink()}>
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      );
    }

    const ttt = room.ttt;
    if (!ttt) return null;
    const current = ttt.turn === "X" ? room.players[0]?.name : room.players[1]?.name;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-black/20 p-3 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span>
              {me?.name} ({mySymbol}) vs {opponent?.name ?? "Waiting"} ({mySymbol === "X" ? "O" : "X"})
            </span>
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${opponent?.connected ? "bg-green-400" : "bg-slate-500"}`} />
              {opponent?.connected ? "Connected" : "Opponent disconnected"}
            </span>
          </div>
          <div className="mt-2">Turn: {current}</div>
        </div>

        <div className="relative mx-auto grid max-w-sm grid-cols-3 gap-2">
          {ttt.board.map((cell, index) => (
            <button
              key={index}
              className="aspect-square rounded-lg bg-emerald-950/30 text-4xl font-bold text-emerald-200 ring-1 ring-emerald-300/25"
              onClick={() => void playMoveMulti(index)}
            >
              <span className="piece-fade">{cell}</span>
            </button>
          ))}
          {ttt.winningLine ? <div className="draw-line" style={winLineStyle(ttt.winningLine)} /> : null}
        </div>

        <div className="rounded-xl border border-slate-700 bg-black/20 p-3 text-sm">
          Player: {ttt.scores.player1} | Opponent: {ttt.scores.player2} | Draws: {ttt.scores.draws}
        </div>

        {ttt.winner ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-black/20 p-3">
            <p>{ttt.winner === "draw" ? "Draw round" : `${ttt.winner === mySymbol ? "You" : "Opponent"} won this round`}</p>
            <button
              className="rounded bg-emerald-400 px-3 py-1 font-semibold text-slate-900"
              onClick={() =>
                void fetch(`/api/rooms/${code}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId, action: { type: "ttt_next_round" } })
                })
              }
            >
              Play Again
            </button>
            <button
              className="rounded border border-emerald-300/50 px-3 py-1"
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
        <h1 className="font-display text-3xl font-bold text-ttt">Tic-Tac-Toe</h1>
        <Link href="/" className="rounded border border-slate-600 px-3 py-1 text-sm">
          Back to Lobby
        </Link>
      </header>
      {mode === "multi" ? multiplayerUi : aiBoard}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
