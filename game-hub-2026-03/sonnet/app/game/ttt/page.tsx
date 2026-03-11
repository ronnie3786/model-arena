"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TTTBoard, TTTCell, TTTState, TTTWinner } from "@/types";
import { checkWinner, getBestMove, WIN_LINES } from "@/lib/ttt-logic";
import { useRoom } from "@/lib/useRoom";
import { sound } from "@/lib/sound";

// ─── Win Line SVG ─────────────────────────────────────────────────────────────

function WinLineSVG({ line }: { line: number[] }) {
  // Map board indices to grid coordinates (center of each cell)
  const coords = [
    [1, 1], [3, 1], [5, 1],
    [1, 3], [3, 3], [5, 3],
    [1, 5], [3, 5], [5, 5],
  ]; // 6x6 grid viewBox

  const [a, , c] = line;
  const [x1, y1] = coords[a];
  const [x2, y2] = coords[c];

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line
        className="win-line"
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#22c55e"
        strokeWidth="0.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

interface CellProps {
  value: TTTCell;
  index: number;
  onClick: () => void;
  disabled: boolean;
  winCell: boolean;
}

function Cell({ value, index, onClick, disabled, winCell }: CellProps) {
  const isX = value === "X";
  const isO = value === "O";

  return (
    <button
      className={`ttt-cell aspect-square flex items-center justify-center rounded-lg border
        ${winCell ? "border-green-500/60 bg-green-500/10" : "border-white/10"}
        ${!value && !disabled ? "cursor-pointer hover:bg-white/5" : "cursor-default"}
        transition-all duration-150`}
      onClick={onClick}
      disabled={disabled || !!value}
      aria-label={`Cell ${index + 1}${value ? `: ${value}` : ""}`}
    >
      {isX && (
        <svg
          className="piece-appear w-[55%] h-[55%]"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="4" y1="4" x2="36" y2="36" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
          <line x1="36" y1="4" x2="4" y2="36" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )}
      {isO && (
        <svg
          className="piece-appear w-[55%] h-[55%]"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="20" cy="20" r="14" fill="none" stroke="#4ade80" strokeWidth="5" />
        </svg>
      )}
    </button>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  scores,
  playerName,
  opponentName,
}: {
  scores: { X: number; O: number; draws: number };
  playerName: string;
  opponentName: string;
}) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      <div className="score-badge px-4 py-2 rounded-xl text-center min-w-[80px]">
        <div className="text-xl font-bold text-green-400">{scores.X}</div>
        <div className="text-xs text-gray-400">{playerName}</div>
      </div>
      <div className="score-badge px-4 py-2 rounded-xl text-center min-w-[60px]">
        <div className="text-xl font-bold text-gray-400">{scores.draws}</div>
        <div className="text-xs text-gray-500">Draws</div>
      </div>
      <div className="score-badge px-4 py-2 rounded-xl text-center min-w-[80px]">
        <div className="text-xl font-bold text-green-300">{scores.O}</div>
        <div className="text-xs text-gray-400">{opponentName}</div>
      </div>
    </div>
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

function WaitingRoom({
  code,
  roomId,
  expiresAt,
}: {
  code: string;
  roomId: string;
  expiresAt: number;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/join/${roomId}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      sound.click();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-6xl mb-2">⏳</div>
      <h2 className="text-2xl font-bold text-center">Waiting for opponent...</h2>

      <div className="bg-[#13131f] border border-green-500/30 rounded-2xl p-8 text-center w-full max-w-xs">
        <p className="text-gray-400 text-sm mb-2">Room Code</p>
        <div className="text-5xl font-mono font-bold tracking-widest text-green-400 mb-4">
          {code}
        </div>
        <button
          onClick={copyLink}
          className="w-full py-2.5 px-4 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 font-semibold transition-all text-sm"
        >
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>
      </div>

      <div className={`text-sm font-mono ${timeLeft < 30 ? "text-red-400" : "text-gray-400"}`}>
        Room expires in {mins}:{secs.toString().padStart(2, "0")}
      </div>

      {timeLeft === 0 && (
        <p className="text-red-400 font-semibold">Room expired. Go back and create a new one.</p>
      )}
    </div>
  );
}

// ─── TTT Game Logic (AI mode) ─────────────────────────────────────────────────

function TTTGameAI({ playerName }: { playerName: string }) {
  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState<"X" | "O">("X");
  const [winner, setWinner] = useState<TTTWinner>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const runCheck = useCallback((newBoard: TTTBoard) => {
    const { winner: w, line } = checkWinner(newBoard);
    if (w) {
      setWinner(w);
      setWinLine(line);
      setScores((prev) => ({
        ...prev,
        X: w === "X" ? prev.X + 1 : prev.X,
        O: w === "O" ? prev.O + 1 : prev.O,
        draws: w === "draw" ? prev.draws + 1 : prev.draws,
      }));
      if (w === "X") sound.win();
      else if (w === "O") sound.lose();
      else sound.draw();
    }
    return w;
  }, []);

  const handleClick = useCallback(
    (idx: number) => {
      if (board[idx] || winner || currentTurn !== "X" || aiThinking) return;

      sound.place();
      const newBoard = [...board] as TTTBoard;
      newBoard[idx] = "X";
      setBoard(newBoard);

      const w = runCheck(newBoard);
      if (!w) {
        setCurrentTurn("O");
        setAiThinking(true);

        aiTimerRef.current = setTimeout(() => {
          const aiMove = getBestMove(newBoard);
          const nextBoard = [...newBoard] as TTTBoard;
          nextBoard[aiMove] = "O";
          setBoard(nextBoard);
          sound.place();
          runCheck(nextBoard);
          setCurrentTurn("X");
          setAiThinking(false);
        }, 400 + Math.random() * 300);
      }
    },
    [board, winner, currentTurn, aiThinking, runCheck]
  );

  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const reset = () => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setBoard(Array(9).fill(null));
    setCurrentTurn("X");
    setWinner(null);
    setWinLine(null);
    setAiThinking(false);
    sound.click();
  };

  const turnText = winner
    ? winner === "draw"
      ? "It's a Draw!"
      : winner === "X"
      ? "You Win!"
      : "AI Wins!"
    : aiThinking
    ? "AI is thinking..."
    : "Your turn (X)";

  return (
    <div className="flex flex-col items-center gap-4">
      <ScoreBar scores={scores} playerName={playerName} opponentName="AI" />

      {/* Turn indicator */}
      <div
        className={`px-4 py-2 rounded-full text-sm font-semibold ${
          winner
            ? winner === "X"
              ? "bg-green-500/20 text-green-400"
              : winner === "draw"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
            : "bg-white/5 text-gray-300"
        }`}
      >
        {turnText}
      </div>

      {/* Board */}
      <div className="relative w-full max-w-[360px] aspect-square">
        <div className="grid grid-cols-3 gap-2 h-full w-full">
          {board.map((cell, i) => (
            <Cell
              key={i}
              value={cell}
              index={i}
              onClick={() => handleClick(i)}
              disabled={!!winner || aiThinking}
              winCell={winLine?.includes(i) ?? false}
            />
          ))}
        </div>
        {winLine && winLine.length === 3 && <WinLineSVG line={winLine} />}
      </div>

      {winner && (
        <button
          className="win-pop px-8 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-all"
          onClick={reset}
        >
          Play Again
        </button>
      )}
    </div>
  );
}

// ─── TTT Game Logic (Multiplayer mode) ───────────────────────────────────────

function TTTGameMultiplayer({
  roomId,
  playerId,
  playerIndex,
}: {
  roomId: string;
  playerId: string;
  playerIndex: number;
}) {
  const router = useRouter();
  const [rematchVoted, setRematchVoted] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const { room, connected, sendAction } = useRoom({
    roomId,
    playerId,
    onEvent: (event) => {
      if (event.type === "player_disconnected") {
        setOpponentDisconnected(true);
      }
      if (event.type === "player_joined" || event.type === "room_update") {
        setOpponentDisconnected(false);
      }
      if (event.type === "rematch_start") {
        setRematchVoted(false);
        setOpponentDisconnected(false);
      }
      // Play sounds on game updates
      if (event.type === "game_update" && event.data.room) {
        const r = event.data.room as { gameState?: TTTState };
        const state = r.gameState;
        if (state?.winner) {
          const myMark = playerIndex === 0 ? "X" : "O";
          if (state.winner === myMark) sound.win();
          else if (state.winner === "draw") sound.draw();
          else sound.lose();
        } else {
          sound.place();
        }
      }
    },
  });

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Connecting...</div>
      </div>
    );
  }

  if (room.status === "waiting") {
    return (
      <WaitingRoom
        code={room.code}
        roomId={roomId}
        expiresAt={room.expiresAt}
      />
    );
  }

  const state = room.gameState as TTTState;
  if (!state) return null;

  const myMark = playerIndex === 0 ? "X" : "O";
  const oppMark = myMark === "X" ? "O" : "X";
  const myName = room.players[playerIndex]?.name ?? "You";
  const oppName = room.players[1 - playerIndex]?.name ?? "Opponent";
  const isMyTurn = state.currentTurn === myMark;

  const handleClick = (idx: number) => {
    if (!isMyTurn || state.winner || state.board[idx]) return;
    sound.place();
    sendAction("ttt_move", { index: idx });
  };

  const handleRematch = () => {
    setRematchVoted(true);
    sound.click();
    sendAction("rematch_vote");
  };

  const otherVoted = room.rematchVotes.some((id) => {
    const oppPlayer = room.players[1 - playerIndex];
    return oppPlayer?.id === id;
  });

  const turnText = state.winner
    ? state.winner === "draw"
      ? "It's a Draw!"
      : state.winner === myMark
      ? "You Win!"
      : `${oppName} Wins!`
    : isMyTurn
    ? "Your turn"
    : `${oppName}'s turn`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Connection + Players */}
      <div className="flex items-center gap-4 mb-1">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400 conn-dot" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-gray-400">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="text-xs text-gray-500">|</div>
        <div className="text-xs text-gray-400">
          {myName} (you, {myMark}) vs {oppName} ({oppMark})
        </div>
      </div>

      {opponentDisconnected && (
        <div className="px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm">
          Opponent disconnected
        </div>
      )}

      <ScoreBar
        scores={state.scores}
        playerName={`${myName} (${myMark})`}
        opponentName={`${oppName} (${oppMark})`}
      />

      <div
        className={`px-4 py-2 rounded-full text-sm font-semibold ${
          state.winner
            ? state.winner === myMark
              ? "bg-green-500/20 text-green-400"
              : state.winner === "draw"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
            : isMyTurn
            ? "bg-green-500/20 text-green-300"
            : "bg-white/5 text-gray-400"
        }`}
      >
        {turnText}
      </div>

      {/* Board */}
      <div className="relative w-full max-w-[360px] aspect-square">
        <div className="grid grid-cols-3 gap-2 h-full w-full">
          {state.board.map((cell, i) => (
            <Cell
              key={i}
              value={cell}
              index={i}
              onClick={() => handleClick(i)}
              disabled={!isMyTurn || !!state.winner}
              winCell={state.winLine?.includes(i) ?? false}
            />
          ))}
        </div>
        {state.winLine && state.winLine.length === 3 && (
          <WinLineSVG line={state.winLine} />
        )}
      </div>

      {/* Rematch */}
      {state.winner && (
        <div className="flex flex-col items-center gap-2 mt-2">
          {!rematchVoted ? (
            <button
              className="win-pop px-8 py-3 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold transition-all"
              onClick={handleRematch}
            >
              Rematch
            </button>
          ) : (
            <div className="text-gray-400 text-sm">
              {otherVoted ? "Starting rematch..." : "Waiting for opponent to accept..."}
            </div>
          )}
          <button
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            onClick={() => router.push("/")}
          >
            Leave game
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TTTPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const mode = params.get("mode");
  const playerName = params.get("playerName") ?? "Player";
  const roomId = params.get("roomId") ?? "";
  const playerId = params.get("playerId") ?? "";
  const playerIndex = parseInt(params.get("playerIndex") ?? "0");

  const isAI = mode === "ai";

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400"
            onClick={() => { sound.click(); router.push("/"); }}
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="font-bold text-lg text-green-400">Tic-Tac-Toe</h1>
          {isAI && <span className="text-xs text-gray-500 ml-auto">vs AI</span>}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {isAI ? (
          <TTTGameAI playerName={playerName} />
        ) : (
          <TTTGameMultiplayer
            roomId={roomId}
            playerId={playerId}
            playerIndex={playerIndex}
          />
        )}
      </main>
    </div>
  );
}

export default function TTTPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">Loading...</div>}>
      <TTTPageInner />
    </Suspense>
  );
}
