import { RPSChoice, RPSRoundResult } from "@/types";

export function getRPSResult(p1: RPSChoice, p2: RPSChoice): RPSRoundResult {
  if (!p1 || !p2) return null;
  if (p1 === p2) return "draw";

  const wins: Record<string, string> = {
    rock: "scissors",
    scissors: "paper",
    paper: "rock",
  };

  return wins[p1] === p2 ? "win" : "lose";
}

export function getRandomChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"];
  return choices[Math.floor(Math.random() * 3)];
}

export const RPS_LABELS: Record<NonNullable<RPSChoice>, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

export const RPS_EMOJI: Record<NonNullable<RPSChoice>, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};
