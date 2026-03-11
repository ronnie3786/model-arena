import { notFound } from "next/navigation";
import { WaitingRoom } from "@/components/waiting-room";
import { getRoom } from "@/lib/rooms";

export default function RoomPage({ params, searchParams }: { params: { roomCode: string }; searchParams: { playerId?: string } }) {
  const room = getRoom(params.roomCode);
  if (!room) notFound();
  const playerId = searchParams.playerId ?? room.players[0]?.id;
  return <WaitingRoom room={room} playerId={playerId} />;
}
