import { notFound } from "next/navigation";
import { RockPaperScissorsGame } from "@/components/rps";
import { TicTacToeGame } from "@/components/tictactoe";
import { getRoom } from "@/lib/rooms";

export default function RoomPlayPage({ params, searchParams }: { params: { roomCode: string }; searchParams: { playerId?: string } }) {
  const room = getRoom(params.roomCode);
  if (!room || !searchParams.playerId) notFound();

  if (room.game === "tictactoe") {
    return <TicTacToeGame room={room} playerId={searchParams.playerId} />;
  }

  return <RockPaperScissorsGame room={room} playerId={searchParams.playerId} />;
}
