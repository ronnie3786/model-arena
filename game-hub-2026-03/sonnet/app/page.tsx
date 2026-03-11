"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sound } from "@/lib/sound";

type GameType = "ttt" | "rps";

interface NameModalProps {
  game: GameType;
  mode: "ai" | "friend";
  onConfirm: (name: string) => void;
  onClose: () => void;
}

function NameModal({ game, mode, onConfirm, onClose }: NameModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    await onConfirm(trimmed);
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="slide-in-up bg-[#13131f] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-center">
          {game === "ttt" ? "Tic-Tac-Toe" : "Rock Paper Scissors"}
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          {mode === "ai" ? "vs AI — Enter your name" : "Multiplayer — Enter your name"}
        </p>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-white/30 placeholder-gray-600 mb-4"
          placeholder="Your name..."
          value={name}
          maxLength={20}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all ${
            game === "ttt"
              ? "bg-green-500 hover:bg-green-400 text-black"
              : "bg-purple-500 hover:bg-purple-400 text-white"
          } ${!name.trim() || loading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={!name.trim() || loading}
          onClick={handleSubmit}
        >
          {loading ? "..." : mode === "ai" ? "Play vs AI" : "Create Room"}
        </button>
        <button
          className="w-full py-2 mt-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── TTT Preview SVG ──────────────────────────────────────────────────────────

function TTTPreview() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Grid lines */}
      <line x1="40" y1="5" x2="40" y2="115" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="80" y1="5" x2="80" y2="115" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="5" y1="40" x2="115" y2="40" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.4" />
      <line x1="5" y1="80" x2="115" y2="80" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.4" />
      {/* X at 0,0 */}
      <line x1="12" y1="12" x2="28" y2="28" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      <line x1="28" y1="12" x2="12" y2="28" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      {/* O at 1,0 */}
      <circle cx="60" cy="20" r="10" fill="none" stroke="#4ade80" strokeWidth="3" />
      {/* X at 2,0 */}
      <line x1="92" y1="12" x2="108" y2="28" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      <line x1="108" y1="12" x2="92" y2="28" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      {/* O at 0,1 */}
      <circle cx="20" cy="60" r="10" fill="none" stroke="#4ade80" strokeWidth="3" />
      {/* X at 1,1 (center) */}
      <line x1="52" y1="52" x2="68" y2="68" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      <line x1="68" y1="52" x2="52" y2="68" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" />
      {/* O at 2,1 */}
      <circle cx="100" cy="60" r="10" fill="none" stroke="#4ade80" strokeWidth="3" />
      {/* O at 0,2 */}
      <circle cx="20" cy="100" r="10" fill="none" stroke="#4ade80" strokeWidth="3" />
      {/* Win line through diagonal X */}
      <line x1="5" y1="5" x2="115" y2="115" stroke="#22c55e" strokeWidth="3" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── RPS Preview SVG ──────────────────────────────────────────────────────────

function RPSPreview() {
  return (
    <div className="flex items-center justify-center gap-4 h-full w-full">
      {["🪨", "📄", "✂️"].map((emoji, i) => (
        <div
          key={i}
          className="text-4xl"
          style={{
            filter: "drop-shadow(0 0 8px rgba(168,85,247,0.6))",
            transform: `rotate(${[-8, 0, 8][i]}deg)`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

// ─── Join Room Modal ──────────────────────────────────────────────────────────

function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleJoin = async () => {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) return;

    setLoading(true);
    setError("");

    try {
      // Find room by code
      const res = await fetch(`/api/rooms?code=${trimmedCode}`);
      if (!res.ok) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }
      const { room } = await res.json();

      // Join the room
      const joinRes = await fetch(`/api/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: trimmedName }),
      });
      if (!joinRes.ok) {
        const data = await joinRes.json();
        setError(data.error || "Could not join room.");
        setLoading(false);
        return;
      }
      const { room: joined, playerId } = await joinRes.json();

      sound.joined();
      router.push(`/game/${joined.gameType}?roomId=${joined.id}&playerId=${playerId}&playerIndex=1`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="slide-in-up bg-[#13131f] border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-center">Join a Room</h2>
        <p className="text-gray-400 text-center text-sm mb-6">Enter the 6-character room code</p>

        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-white/30 placeholder-gray-600 mb-3 uppercase tracking-widest text-center font-mono"
          placeholder="ROOM CODE"
          value={code}
          maxLength={6}
          autoFocus
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && name && handleJoin()}
        />
        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-white/30 placeholder-gray-600 mb-4"
          placeholder="Your name..."
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && code && handleJoin()}
        />

        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}

        <button
          className={`w-full py-3 rounded-xl font-bold text-lg bg-blue-500 hover:bg-blue-400 text-white transition-all ${
            !code.trim() || !name.trim() || loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={!code.trim() || !name.trim() || loading}
          onClick={handleJoin}
        >
          {loading ? "Joining..." : "Join Game"}
        </button>
        <button
          className="w-full py-2 mt-2 text-gray-500 hover:text-gray-300 transition-colors text-sm"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Game Card ────────────────────────────────────────────────────────────────

interface GameCardProps {
  game: GameType;
  onPlayAI: () => void;
  onPlayFriend: () => void;
}

function GameCard({ game, onPlayAI, onPlayFriend }: GameCardProps) {
  const isTTT = game === "ttt";
  const accent = isTTT ? "green" : "purple";
  const borderColor = isTTT ? "border-green-500/30" : "border-purple-500/30";
  const hoverBorder = isTTT ? "hover:border-green-500/60" : "hover:border-purple-500/60";
  const glowColor = isTTT ? "hover:shadow-green-500/20" : "hover:shadow-purple-500/20";
  const aiBtn = isTTT
    ? "bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-400"
    : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-400";
  const friendBtn = isTTT
    ? "bg-green-500 hover:bg-green-400 text-black"
    : "bg-purple-500 hover:bg-purple-400 text-white";

  return (
    <div
      className={`relative bg-[#13131f] border ${borderColor} ${hoverBorder} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${glowColor} hover:scale-[1.02] group`}
    >
      {/* Preview area */}
      <div
        className={`h-48 flex items-center justify-center relative overflow-hidden`}
        style={{
          background: isTTT
            ? "radial-gradient(ellipse at center, rgba(34,197,94,0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(168,85,247,0.08) 0%, transparent 70%)",
        }}
      >
        {isTTT ? <TTTPreview /> : <RPSPreview />}
        {/* Shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 card-shimmer pointer-events-none" />
      </div>

      {/* Info */}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-1">
          {isTTT ? "Tic-Tac-Toe" : "Rock Paper Scissors"}
        </h2>
        <p className="text-gray-400 text-sm mb-5">
          {isTTT
            ? "Classic strategy — play vs unbeatable AI or challenge a friend"
            : "Best of 5 series — simultaneous reveal, no peeking!"}
        </p>
        <div className="flex gap-3">
          <button
            className={`flex-1 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all ${aiBtn}`}
            onClick={() => { sound.click(); onPlayAI(); }}
          >
            vs AI
          </button>
          <button
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${friendBtn}`}
            onClick={() => { sound.click(); onPlayFriend(); }}
          >
            Play with Friend
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();
  const [modal, setModal] = useState<{
    game: GameType;
    mode: "ai" | "friend";
  } | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const handleConfirm = async (name: string) => {
    if (!modal) return;

    if (modal.mode === "ai") {
      router.push(`/game/${modal.game}?mode=ai&playerName=${encodeURIComponent(name)}`);
      return;
    }

    // Create room
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: modal.game, playerName: name }),
    });
    const data = await res.json();
    if (data.error) return;

    sound.joined();
    router.push(
      `/game/${modal.game}?roomId=${data.room.id}&playerId=${data.playerId}&playerIndex=0`
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎮</div>
            <h1 className="text-xl font-bold">Game Hub</h1>
          </div>
          <button
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 transition-all border border-white/10"
            onClick={() => { sound.click(); setShowJoin(true); }}
          >
            Join with Code
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-extrabold mb-3 bg-gradient-to-r from-green-400 to-purple-400 bg-clip-text text-transparent">
          Play Games
        </h2>
        <p className="text-gray-400 text-lg">
          Challenge the AI or play with a friend in real-time
        </p>
      </section>

      {/* Game cards */}
      <section className="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <GameCard
          game="ttt"
          onPlayAI={() => setModal({ game: "ttt", mode: "ai" })}
          onPlayFriend={() => setModal({ game: "ttt", mode: "friend" })}
        />
        <GameCard
          game="rps"
          onPlayAI={() => setModal({ game: "rps", mode: "ai" })}
          onPlayFriend={() => setModal({ game: "rps", mode: "friend" })}
        />
      </section>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-600 text-sm border-t border-white/5">
        Game Hub — multiplayer powered by SSE
      </footer>

      {/* Modals */}
      {modal && (
        <NameModal
          game={modal.game}
          mode={modal.mode}
          onConfirm={handleConfirm}
          onClose={() => setModal(null)}
        />
      )}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
    </main>
  );
}
