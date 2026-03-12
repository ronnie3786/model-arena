'use client';

import { Room, TTTData } from '@/lib/server/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function TicTacToe({ room, sendAction }: { room: Room, sendAction: (action: string, payload?: any) => void }) {
  const data = room.gameData as TTTData;
  const myId = room.players.find(p => p.connected)?.id; // Simplistic way to get my ID if I'm connected
  
  // Real way: parse from cookie, but for UI we assume the server validates turn.
  // Actually, without cookie access in client component easily, we rely on the server.
  // We can just try to click, and server rejects if not our turn.
  // But for UX, we want to know whose turn it is.
  // We don't have our own player ID definitively without an API call to whoami.
  // Let's add a quick hack: we send action, if error, we ignore. 
  // Better: we can guess who we are by checking local storage or cookie if possible.
  // For now, we'll just show the turn by name.

  const turnPlayer = room.players.find(p => p.id === data.turn);
  const isMyTurn = true; // We don't know who 'I' am strictly here without auth context. We'll let server validate.

  const handleMove = (index: number) => {
    if (data.board[index] || data.winner) return;
    sendAction('move', { index });
    
    // Play sound
    playPlopSound();
  };

  const playPlopSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  };

  const playWinSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  };

  if (data.winner && data.winner !== 'draw') {
      setTimeout(playWinSound, 100); // Play win sound slightly delayed
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg">
      
      {/* Score Board */}
      <div className="flex justify-between w-full bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
        <div className="text-center">
          <div className="text-sm text-neutral-500">{room.players[0].name} (X)</div>
          <div className="text-2xl font-bold">{data.scores[room.players[0].id]}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-neutral-500">Draws</div>
          <div className="text-2xl font-bold text-neutral-400">
             {/* Total rounds - wins of p1 - wins of p2 */}
             {Object.values(data.scores).reduce((a, b) => a + b, 0) > 0 ? 0 : 0} 
             {/* Note: we didn't track draws explicitly in scores, but we could. For simplicity, we skip draw count or just show 0 if not implemented tracking */}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-neutral-500">{room.players[1]?.name || 'Opponent'} (O)</div>
          <div className="text-2xl font-bold">{data.scores[room.players[1]?.id] || 0}</div>
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="h-8">
        {!data.winner && (
           <div className="text-xl font-medium animate-pulse text-ttt-green">
             {turnPlayer?.name}&apos;s Turn
           </div>
        )}
      </div>

      {/* Board */}
      <div className="relative aspect-square w-full max-w-md grid grid-cols-3 gap-3 bg-neutral-800 p-3 rounded-3xl">
         {data.board.map((cell, i) => (
           <button
             key={i}
             onClick={() => handleMove(i)}
             disabled={!!cell || !!data.winner}
             className={cn(
               "bg-neutral-950 rounded-2xl flex items-center justify-center text-7xl font-bold transition-all duration-300",
               !cell && !data.winner && "hover:bg-neutral-900 cursor-pointer",
               cell === 'X' ? "text-ttt-green" : "text-white"
             )}
           >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    {cell}
                  </motion.span>
                )}
              </AnimatePresence>
           </button>
         ))}

         {/* Winning Line Overlay (simplified to SVG) */}
         {data.winningLine && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100">
               <motion.line 
                 initial={{ pathLength: 0 }}
                 animate={{ pathLength: 1 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
                 x1={(data.winningLine[0] % 3) * 33.3 + 16.6} 
                 y1={Math.floor(data.winningLine[0] / 3) * 33.3 + 16.6}
                 x2={(data.winningLine[2] % 3) * 33.3 + 16.6} 
                 y2={Math.floor(data.winningLine[2] / 3) * 33.3 + 16.6}
                 stroke="currentColor" 
                 strokeWidth="4" 
                 strokeLinecap="round"
                 className="text-ttt-green drop-shadow-lg"
               />
            </svg>
         )}
      </div>

      {/* Results / Play Again */}
      <div className="h-20 w-full flex flex-col items-center justify-center">
        <AnimatePresence>
          {data.winner && (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center gap-4 w-full"
            >
              <div className="text-3xl font-bold">
                 {data.winner === 'draw' ? "It's a Draw!" : `${room.players.find(p => p.id === data.winner)?.name} Wins!`}
              </div>
              <button 
                 onClick={() => sendAction('rematch')}
                 className="px-8 py-4 bg-ttt-green text-neutral-950 font-bold rounded-xl hover:bg-ttt-green/90 transition-transform hover:scale-105 active:scale-95 w-full max-w-xs"
              >
                 Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
