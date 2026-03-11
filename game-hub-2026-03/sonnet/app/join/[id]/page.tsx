"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { sound } from "@/lib/sound";

function JoinPageInner() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roomInfo, setRoomInfo] = useState<{ gameType: string; code: string; status: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Validate the room
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError("Room not found or has expired.");
        } else {
          setRoomInfo({
            gameType: data.room.gameType,
            code: data.room.code,
            status: data.room.status,
          });
          if (data.room.status !== "waiting") {
            setError("This room is full or the game has already started.");
          }
        }
        setChecking(false);
      })
      .catch(() => {
        setError("Could not connect to server.");
        setChecking(false);
      });
  }, [roomId]);

  const handleJoin = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join room.");
        setLoading(false);
        return;
      }

      sound.joined();
      router.push(
        `/game/${data.room.gameType}?roomId=${data.room.id}&playerId=${data.playerId}&playerIndex=1`
      );
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  const gameLabels: Record<string, string> = {
    ttt: "Tic-Tac-Toe",
    rps: "Rock Paper Scissors",
  };
  const gameEmojis: Record<string, string> = { ttt: "❌", rps: "✂️" };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      <div className="slide-in-up w-full max-w-sm">
        {checking ? (
          <div className="text-center text-gray-400">Checking room...</div>
        ) : error && !roomInfo ? (
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              onClick={() => router.push("/")}
            >
              Back to Lobby
            </button>
          </div>
        ) : (
          <div className="bg-[#13131f] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">
                {gameEmojis[roomInfo?.gameType ?? "ttt"]}
              </div>
              <h1 className="text-2xl font-bold">
                {gameLabels[roomInfo?.gameType ?? "ttt"]}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Room code:{" "}
                <span className="font-mono text-white tracking-wider">
                  {roomInfo?.code}
                </span>
              </p>
            </div>

            {error ? (
              <>
                <p className="text-red-400 text-center text-sm mb-4">{error}</p>
                <button
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                  onClick={() => router.push("/")}
                >
                  Back to Lobby
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm text-center mb-4">
                  Enter your name to join the game
                </p>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-white/30 placeholder-gray-600 mb-4"
                  placeholder="Your name..."
                  value={name}
                  maxLength={20}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
                <button
                  className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
                    roomInfo?.gameType === "ttt"
                      ? "bg-green-500 hover:bg-green-400 text-black"
                      : "bg-purple-500 hover:bg-purple-400 text-white"
                  } ${!name.trim() || loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!name.trim() || loading}
                  onClick={handleJoin}
                >
                  {loading ? "Joining..." : "Join Game"}
                </button>
                <button
                  className="w-full py-2 mt-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
                  onClick={() => router.push("/")}
                >
                  Back to Lobby
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">Loading...</div>}>
      <JoinPageInner />
    </Suspense>
  );
}
