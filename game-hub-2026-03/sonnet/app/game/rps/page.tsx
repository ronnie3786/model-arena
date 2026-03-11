"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RPSChoice, RPSState } from "@/types";
import { getRPSResult, getRandomChoice, RPS_EMOJI, RPS_LABELS } from "@/lib/rps-logic";
import { useRoom } from "@/lib/useRoom";
import { sound } from "@/lib/sound";

// ─── Choice Button ─────────────────────────────────────────────────────────────

interface ChoiceButtonProps {
  choice: NonNullable<RPSChoice>;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function ChoiceButton({ choice, selected, disabled, onClick }: ChoiceButtonProps) {
  return (
    <button
      className={`rps-choice flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all
        ${selected
          ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/30 -translate-y-2"
          : "border-white/10 bg-white/5"
        }
        ${disabled && !selected ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="text-5xl" style={{ lineHeight: 1 }}>
        {RPS_EMOJI[choice]}
      </span>
      <span className="text-sm font-semibold text-gray-300">{RPS_LABELS[choice]}</span>
    </button>
  );
}

// ─── Progress dots (best of 5) ────────────────────────────────────────────────

function ProgressDots({ score, total = 3 }: { score: number; total?: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            i < score ? "bg-purple-400" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Countdown overlay ────────────────────────────────────────────────────────

function CountdownOverlay({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    sound.countdown();
    const t1 = setTimeout(() => { setCount(2); sound.countdown(); }, 900);
    const t2 = setTimeout(() => { setCount(1); sound.countdown(); }, 1800);
    const t3 = setTimeout(() => {
      sound.reveal();
      onDoneRef.current();
    }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        key={count}
        className="countdown-num text-[120px] font-black text-purple-400 select-none"
      >
        {count}
      </div>
    </div>
  );
}

// ─── Reveal card ──────────────────────────────────────────────────────────────

function RevealCard({
  choice,
  label,
  result,
}: {
  choice: RPSChoice;
  label: string;
  result?: "win" | "lose" | "draw" | null;
}) {
  const resultColors = {
    win: "text-green-400",
    lose: "text-red-400",
    draw: "text-yellow-400",
  };
  const resultText = {
    win: "You Win!",
    lose: "You Lose!",
    draw: "Draw!",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm text-gray-400 font-medium">{label}</div>
      <div
        className={`flip-reveal w-24 h-24 flex items-center justify-center rounded-2xl border-2 ${
          result === "win"
            ? "border-green-400/60 bg-green-500/10"
            : result === "lose"
            ? "border-red-400/60 bg-red-500/10"
            : "border-white/20 bg-white/5"
        }`}
      >
        <span className="text-5xl">{choice ? RPS_EMOJI[choice] : "?"}</span>
      </div>
      {result && (
        <div className={`win-pop text-lg font-bold ${resultColors[result]}`}>
          {resultText[result]}
        </div>
      )}
    </div>
  );
}

// ─── Waiting Room ─────────────────────────────────────────────────────────────

function WaitingRoom({
  code,
  roomId,
  expiresAt,
  accentColor,
}: {
  code: string;
  roomId: string;
  expiresAt: number;
  accentColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const link =
    typeof window !== "undefined"
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

  const borderClass = accentColor === "green" ? "border-green-500/30" : "border-purple-500/30";
  const textClass = accentColor === "green" ? "text-green-400" : "text-purple-400";
  const btnClass =
    accentColor === "green"
      ? "bg-green-500/20 hover:bg-green-500/30 border-green-500/40 text-green-400"
      : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-400";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="text-6xl mb-2">{accentColor === "green" ? "⌛" : "✂️"}</div>
      <h2 className="text-2xl font-bold text-center">Waiting for opponent...</h2>

      <div className={`bg-[#13131f] border ${borderClass} rounded-2xl p-8 text-center w-full max-w-xs`}>
        <p className="text-gray-400 text-sm mb-2">Room Code</p>
        <div className={`text-5xl font-mono font-bold tracking-widest ${textClass} mb-4`}>
          {code}
        </div>
        <button
          onClick={copyLink}
          className={`w-full py-2.5 px-4 rounded-xl border font-semibold transition-all text-sm ${btnClass}`}
        >
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>
      </div>

      <div
        className={`text-sm font-mono ${
          timeLeft < 30 ? "text-red-400" : "text-gray-400"
        }`}
      >
        Room expires in {mins}:{secs.toString().padStart(2, "0")}
      </div>

      {timeLeft === 0 && (
        <p className="text-red-400 font-semibold">Room expired.</p>
      )}
    </div>
  );
}

// ─── RPS AI Mode ──────────────────────────────────────────────────────────────

function RPSGameAI({ playerName }: { playerName: string }) {
  const router = useRouter();
  const [myChoice, setMyChoice] = useState<RPSChoice>(null);
  const [aiChoice, setAiChoice] = useState<RPSChoice>(null);
  const [phase, setPhase] = useState<"choosing" | "countdown" | "result">("choosing");
  const [result, setResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [roundResults, setRoundResults] = useState<("win" | "lose" | "draw")[]>([]);
  const [seriesOver, setSeriesOver] = useState(false);

  const handleChoose = (choice: RPSChoice) => {
    if (phase !== "choosing") return;
    sound.click();
    setMyChoice(choice);
    setPhase("countdown");
  };

  const handleCountdownDone = useCallback(() => {
    const ai = getRandomChoice();
    setAiChoice(ai);
    const r = getRPSResult(myChoice, ai);
    setResult(r);

    const newScores: [number, number] = [...scores];
    const newRoundResults = [...roundResults, r!];
    setRoundResults(newRoundResults);

    if (r === "win") { newScores[0]++; sound.win(); }
    else if (r === "lose") { newScores[1]++; sound.lose(); }
    else { sound.draw(); }
    setScores(newScores);
    setPhase("result");

    if (newScores[0] >= 3 || newScores[1] >= 3) {
      setSeriesOver(true);
    }
  }, [myChoice, scores, roundResults]);

  const nextRound = () => {
    setMyChoice(null);
    setAiChoice(null);
    setResult(null);
    setPhase("choosing");
    sound.click();
  };

  const restart = () => {
    setMyChoice(null);
    setAiChoice(null);
    setResult(null);
    setPhase("choosing");
    setScores([0, 0]);
    setRoundResults([]);
    setSeriesOver(false);
    sound.click();
  };

  if (seriesOver) {
    const iWin = scores[0] >= 3;
    return (
      <div className="slide-in-up flex flex-col items-center gap-6">
        <div className="text-6xl">{iWin ? "🏆" : "😔"}</div>
        <h2 className={`text-3xl font-black ${iWin ? "text-green-400" : "text-red-400"}`}>
          {iWin ? "You Won!" : "AI Wins!"}
        </h2>
        <div className="text-xl text-gray-300 font-bold">
          {scores[0]} – {scores[1]}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {roundResults.map((r, i) => (
            <div
              key={i}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                r === "win" ? "bg-green-500" : r === "lose" ? "bg-red-500" : "bg-yellow-500"
              }`}
            >
              {r === "win" ? "W" : r === "lose" ? "L" : "D"}
            </div>
          ))}
        </div>
        <button
          className="px-8 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-all"
          onClick={restart}
        >
          Play Again
        </button>
        <button
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          onClick={() => router.push("/")}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Scores + progress */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sm text-gray-400">{playerName}</div>
          <ProgressDots score={scores[0]} />
        </div>
        <div className="text-2xl font-bold text-gray-300">
          {scores[0]} <span className="text-gray-600">–</span> {scores[1]}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sm text-gray-400">AI</div>
          <ProgressDots score={scores[1]} />
        </div>
      </div>

      <div className="text-xs text-gray-500 font-mono">
        Round {roundResults.length + (phase === "choosing" ? 1 : 0)} · Best of 5
      </div>

      {phase === "choosing" && (
        <div className="slide-in-up flex flex-col items-center gap-4">
          <p className="text-gray-300 font-medium">Pick your weapon!</p>
          <div className="grid grid-cols-3 gap-3">
            {(["rock", "paper", "scissors"] as const).map((c) => (
              <ChoiceButton
                key={c}
                choice={c}
                selected={myChoice === c}
                disabled={false}
                onClick={() => handleChoose(c)}
              />
            ))}
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <CountdownOverlay onDone={handleCountdownDone} />
      )}

      {phase === "result" && (
        <div className="slide-in-up flex flex-col items-center gap-6">
          <div className="flex gap-8 items-center">
            <RevealCard choice={myChoice} label={playerName} result={result} />
            <div className="text-2xl font-bold text-gray-600">vs</div>
            <RevealCard
              choice={aiChoice}
              label="AI"
              result={result === "win" ? "lose" : result === "lose" ? "win" : "draw"}
            />
          </div>
          <button
            className="px-8 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-all"
            onClick={nextRound}
          >
            Next Round
          </button>
        </div>
      )}
    </div>
  );
}

// ─── RPS Multiplayer ──────────────────────────────────────────────────────────

function RPSGameMultiplayer({
  roomId,
  playerId,
  playerIndex,
}: {
  roomId: string;
  playerId: string;
  playerIndex: number;
}) {
  const router = useRouter();
  // Local display phase after countdown
  const [localPhase, setLocalPhase] = useState<"waiting" | "countdown" | "result">("waiting");
  const [rematchVoted, setRematchVoted] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const prevServerPhaseRef = useRef<string>("");

  const { room, connected, sendAction } = useRoom({
    roomId,
    playerId,
    onEvent: (event) => {
      if (event.type === "player_disconnected") setOpponentDisconnected(true);
      if (event.type === "player_joined" || event.type === "room_update") setOpponentDisconnected(false);
      if (event.type === "rematch_start") {
        setRematchVoted(false);
        setOpponentDisconnected(false);
        setLocalPhase("waiting");
        prevServerPhaseRef.current = "";
      }
      if (event.type === "game_update" && event.data.room) {
        const r = event.data.room as { gameState?: RPSState };
        const state = r.gameState;
        if (!state) return;

        // Trigger countdown when server enters "revealing" phase
        if (state.phase === "revealing" && prevServerPhaseRef.current !== "revealing") {
          setLocalPhase("countdown");
        }
        // If server went straight to result (e.g. from reconnect)
        if ((state.phase === "result" || state.phase === "series_over") && localPhase === "waiting") {
          setLocalPhase("result");
        }
        prevServerPhaseRef.current = state.phase;
      }
    },
  });

  const handleCountdownDone = useCallback(() => {
    // Show the result
    const state = room?.gameState as RPSState | undefined;
    const lastRound = state?.rounds[state.rounds.length - 1];
    if (lastRound) {
      const myResult = playerIndex === 0
        ? lastRound.result
        : lastRound.result === "win" ? "lose" : lastRound.result === "lose" ? "win" : "draw";
      if (myResult === "win") sound.win();
      else if (myResult === "lose") sound.lose();
      else sound.draw();
    }
    setLocalPhase("result");
  }, [room, playerIndex]);

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
        accentColor="purple"
      />
    );
  }

  const state = room.gameState as RPSState;
  if (!state) return null;

  const myName = room.players[playerIndex]?.name ?? "You";
  const oppName = room.players[1 - playerIndex]?.name ?? "Opponent";
  const myChoice = state.currentChoices[playerIndex];
  const lastRound = state.rounds[state.rounds.length - 1];

  const myResult = lastRound
    ? playerIndex === 0
      ? lastRound.result
      : lastRound.result === "win" ? "lose" : lastRound.result === "lose" ? "win" : "draw"
    : null;

  const oppResult =
    myResult === "win" ? "lose" : myResult === "lose" ? "win" : myResult;

  const handleChoose = (choice: RPSChoice) => {
    if (state.phase !== "choosing" || myChoice) return;
    sound.click();
    sendAction("rps_choose", { choice });
  };

  const handleNextRound = () => {
    sound.click();
    setLocalPhase("waiting");
    prevServerPhaseRef.current = "choosing";
    sendAction("rps_next_round");
  };

  const handleRematch = () => {
    setRematchVoted(true);
    sound.click();
    sendAction("rematch_vote");
  };

  const otherVoted = room.rematchVotes.some(
    (id) => room.players[1 - playerIndex]?.id === id
  );

  // Series over
  if (state.phase === "series_over") {
    const iWon = state.seriesWinner === playerIndex;
    return (
      <div className="slide-in-up flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 conn-dot" : "bg-red-400"}`} />
          <span className="text-xs text-gray-400">{myName} vs {oppName}</span>
        </div>
        <div className="text-6xl">{iWon ? "🏆" : "😔"}</div>
        <h2 className={`text-3xl font-black ${iWon ? "text-green-400" : "text-red-400"}`}>
          {iWon ? "You Won!" : `${oppName} Won!`}
        </h2>
        <div className="text-xl font-bold text-gray-300">
          {state.scores[playerIndex]} <span className="text-gray-600">–</span> {state.scores[1 - playerIndex]}
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {state.rounds.map((r, i) => {
            const myR = playerIndex === 0
              ? r.result
              : r.result === "win" ? "lose" : r.result === "lose" ? "win" : "draw";
            return (
              <div
                key={i}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                  myR === "win" ? "bg-green-500" : myR === "lose" ? "bg-red-500" : "bg-yellow-500"
                }`}
              >
                {myR === "win" ? "W" : myR === "lose" ? "L" : "D"}
              </div>
            );
          })}
        </div>

        {!rematchVoted ? (
          <button
            className="px-8 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-all"
            onClick={handleRematch}
          >
            Rematch
          </button>
        ) : (
          <div className="text-gray-400 text-sm">
            {otherVoted ? "Starting rematch..." : "Waiting for opponent..."}
          </div>
        )}
        <button
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
          onClick={() => router.push("/")}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Connection + names */}
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 conn-dot" : "bg-red-400"}`} />
        <span className="text-xs text-gray-400">{connected ? "Connected" : "Disconnected"}</span>
        <span className="text-gray-600 text-xs">|</span>
        <span className="text-xs text-gray-400">{myName} vs {oppName}</span>
      </div>

      {opponentDisconnected && (
        <div className="px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm">
          Opponent disconnected
        </div>
      )}

      {/* Scores */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sm text-gray-400">{myName}</div>
          <ProgressDots score={state.scores[playerIndex]} />
        </div>
        <div className="text-2xl font-bold text-gray-300">
          {state.scores[playerIndex]} <span className="text-gray-600">–</span> {state.scores[1 - playerIndex]}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-sm text-gray-400">{oppName}</div>
          <ProgressDots score={state.scores[1 - playerIndex]} />
        </div>
      </div>

      <div className="text-xs text-gray-500 font-mono">
        Round {state.rounds.length + (state.phase === "choosing" ? 1 : 0)} · Best of 5
      </div>

      {/* Choosing */}
      {state.phase === "choosing" && localPhase === "waiting" && (
        <div className="slide-in-up flex flex-col items-center gap-4">
          {!myChoice ? (
            <>
              <p className="text-gray-300 font-medium">Pick your weapon!</p>
              <div className="grid grid-cols-3 gap-3">
                {(["rock", "paper", "scissors"] as const).map((c) => (
                  <ChoiceButton
                    key={c}
                    choice={c}
                    selected={false}
                    disabled={false}
                    onClick={() => handleChoose(c)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">{RPS_EMOJI[myChoice]}</div>
              <p className="text-purple-300 font-semibold text-lg">
                {RPS_LABELS[myChoice]} locked in!
              </p>
              <p className="text-gray-500 text-sm animate-pulse">
                Waiting for {oppName}...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Countdown */}
      {localPhase === "countdown" && (
        <CountdownOverlay onDone={handleCountdownDone} />
      )}

      {/* Result */}
      {localPhase === "result" && (
        <div className="slide-in-up flex flex-col items-center gap-6">
          <div className="flex gap-8 items-center">
            <RevealCard
              choice={lastRound?.choices[playerIndex] ?? myChoice}
              label={myName}
              result={myResult}
            />
            <div className="text-2xl font-bold text-gray-600">vs</div>
            <RevealCard
              choice={lastRound?.choices[1 - playerIndex] ?? null}
              label={oppName}
              result={oppResult}
            />
          </div>
          <button
            className="px-8 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold transition-all"
            onClick={handleNextRound}
          >
            Next Round
          </button>
        </div>
      )}

      {/* "Revealing" phase but countdown hasn't fired yet — this shouldn't happen normally */}
      {state.phase === "revealing" && localPhase === "waiting" && (
        <div className="text-gray-400 text-sm animate-pulse">Calculating result...</div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function RPSPageInner() {
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
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 text-lg"
            onClick={() => { sound.click(); router.push("/"); }}
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="font-bold text-lg text-purple-400">Rock Paper Scissors</h1>
          {isAI && <span className="text-xs text-gray-500 ml-auto">vs AI</span>}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {isAI ? (
          <RPSGameAI playerName={playerName} />
        ) : (
          <RPSGameMultiplayer
            roomId={roomId}
            playerId={playerId}
            playerIndex={playerIndex}
          />
        )}
      </main>
    </div>
  );
}

export default function RPSPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-gray-400">Loading...</div>}>
      <RPSPageInner />
    </Suspense>
  );
}
