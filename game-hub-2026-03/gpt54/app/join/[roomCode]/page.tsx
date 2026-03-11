import { JoinRoom } from "@/components/join-room";

export default function JoinByCodePage({ params }: { params: { roomCode: string } }) {
  return <JoinRoom initialCode={params.roomCode} />;
}
