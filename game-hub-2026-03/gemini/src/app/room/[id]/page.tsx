'use client';

import { useEffect, useState } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { useParams } from 'next/navigation';
import TicTacToe from '@/components/TicTacToe';
import RockPaperScissors from '@/components/RockPaperScissors';
import { Copy, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you create a utils file

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { room, error, sendAction } = useRoom(roomId);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);

  // We need the player ID from somewhere, since cookies aren't directly available here easily.
  // The server knows the player ID from the cookie.
  // For UI, we mostly just need to know if we are player 1 or 2, which we can guess by name if needed, 
  // but it's better to get the cookie. For this prototype, we'll fetch it or just rely on the server for validation.
  // Actually, we can just look at who has `connected: true` and match our session if possible. 
  // Wait, if we just joined, we don't have our ID. Let's just pass an empty state for now and let the server handle auth.
  
  useEffect(() => {
    if (room?.state === 'waiting') {
       const interval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - room.createdAt) / 1000);
          const remaining = Math.max(0, 120 - elapsed);
          setTimeLeft(remaining);
          if (remaining === 0) clearInterval(interval);
       }, 1000);
       return () => clearInterval(interval);
    }
  }, [room]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-neutral-400">{error}</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-6 py-3 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors">Go Home</button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-100 mb-4"></div>
        <p className="text-neutral-400">Loading room...</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (room.state === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-8">
          <div className="w-20 h-20 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto">
             <Users className="w-10 h-10 text-neutral-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Waiting for opponent...</h1>
            <p className="text-neutral-400">Share this code or link with a friend.</p>
          </div>

          <div className="bg-neutral-950 rounded-xl p-6 border border-neutral-800 relative group cursor-pointer hover:border-neutral-700 transition-colors" onClick={handleCopy}>
            <div className="text-5xl font-mono font-bold tracking-[0.2em]">{room.id}</div>
            <div className="absolute inset-0 bg-neutral-900/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="flex items-center gap-2 font-medium">
                 {copied ? <><Check className="w-5 h-5 text-green-500" /> Copied!</> : <><Copy className="w-5 h-5" /> Click to Copy Link</>}
               </span>
            </div>
          </div>

          <div className="text-sm text-neutral-500 font-mono">
            Room expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      {/* Header with Player info */}
      <header className="flex justify-between items-center mb-8 max-w-4xl w-full mx-auto bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
         <div className="flex items-center gap-3">
           <div className={cn("w-3 h-3 rounded-full", room.players[0].connected ? "bg-green-500" : "bg-red-500")} />
           <span className="font-semibold">{room.players[0].name}</span>
         </div>
         <div className="text-neutral-500 font-mono text-sm tracking-widest">{room.id}</div>
         <div className="flex items-center gap-3">
           <span className="font-semibold">{room.players[1]?.name || 'Opponent'}</span>
           <div className={cn("w-3 h-3 rounded-full", room.players[1]?.connected ? "bg-green-500" : "bg-red-500")} />
         </div>
      </header>

      {/* Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center">
        {!room.players[0].connected || !room.players[1]?.connected ? (
           <div className="text-center p-8 bg-neutral-900/50 rounded-3xl border border-neutral-800 backdrop-blur-sm">
             <div className="text-2xl font-bold text-red-400 mb-2">Opponent disconnected</div>
             <p className="text-neutral-400">Waiting for them to reconnect...</p>
           </div>
        ) : (
          room.gameType === 'tic-tac-toe' ? (
             <TicTacToe room={room} sendAction={sendAction} />
          ) : (
             <RockPaperScissors room={room} sendAction={sendAction} />
          )
        )}
      </main>
    </div>
  );
}
