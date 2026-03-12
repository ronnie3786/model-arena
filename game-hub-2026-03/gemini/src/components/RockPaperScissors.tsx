'use client';

import { Room, RPSData, RPSChoice } from '@/lib/server/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { HandMetal, Scroll, Scissors } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function RockPaperScissors({ room, sendAction }: { room: Room, sendAction: (action: string, payload?: any) => void }) {
  const data = room.gameData as RPSData;
  const p1 = room.players[0];
  const p2 = room.players[1];

  // We need to guess who we are. In a real app, use auth token/cookie.
  // Here we'll guess by connected status or just show both if we don't know.
  // We'll let the user click and server validates. For UI, we'll assume we can't tell who is who 
  // easily so we'll just allow clicking both sides or we could prompt for "Who are you?"
  // Actually, we can check localStorage to match name or ID, but for now let's just show a general board.
  // A better way: The server should tell us `myId`. Since we don't have it, let's just 
  // make it a shared view where anyone can click any side's buttons (like local coop) but 
  // since it's multiplayer, we really need our own view.

  const [localChoice, setLocalChoice] = useState<RPSChoice>(null);

  // We'll use a hack to figure out who we are based on what's missing, but really we should get ID.
  // Since we don't have ID, we'll just let the server reject if it's the wrong player.
  // Actually, we need to know who we are to render "You chose" correctly.
  // Let's assume we are player 1 if we created it (usually true, but hard to prove).
  // Let's just make it simple: buttons send the action, server figures out who we are from cookie.
  
  const handleChoice = (choice: RPSChoice) => {
    if (localChoice || data.winner) return;
    setLocalChoice(choice);
    sendAction('choice', { choice });
  };

  // Reset local choice on new round
  useEffect(() => {
    if (!data.winner && !data.players[p1.id]?.choice && !data.players[p2?.id]?.choice) {
      setLocalChoice(null);
    }
  }, [data.round, data.winner, data.players, p1.id, p2?.id]);


  const icons = {
    rock: HandMetal,
    paper: Scroll,
    scissors: Scissors,
  };

  const choices: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];

  const p1Choice = data.players[p1.id]?.choice;
  const p2Choice = data.players[p2?.id]?.choice;

  const bothChosen = p1Choice && p2Choice;
  const showReveal = !!data.winner;

  // Animation states
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
     if (bothChosen && !data.winner) {
        // Technically server determines winner instantly. 
        // We could add artificial delay on server or handle animation here.
        // For simplicity, since server instantly sets winner, we just show winner.
     }
  }, [bothChosen, data.winner]);

  return (
    <div className="flex flex-col items-center gap-12 w-full max-w-2xl">
      
      {/* Series Progress */}
      <div className="w-full flex justify-between items-center bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
         <div className="flex flex-col items-center gap-2">
            <span className="font-bold text-xl">{p1.name}</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn("w-4 h-4 rounded-full", i < data.players[p1.id].score ? "bg-rps-purple" : "bg-neutral-800")} />
              ))}
            </div>
         </div>
         <div className="text-center">
            <div className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-1">Round {data.round}</div>
            <div className="text-3xl font-black text-neutral-400">VS</div>
         </div>
         <div className="flex flex-col items-center gap-2">
            <span className="font-bold text-xl">{p2?.name || 'Opponent'}</span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn("w-4 h-4 rounded-full", i < data.players[p2?.id]?.score ? "bg-rps-purple" : "bg-neutral-800")} />
              ))}
            </div>
         </div>
      </div>

      {/* Arena */}
      <div className="flex justify-between w-full relative">
         
         {/* Player 1 Side */}
         <div className="flex flex-col items-center gap-4 flex-1">
           <AnimatePresence mode="wait">
             {showReveal ? (
                <motion.div 
                   key="reveal-p1"
                   initial={{ scale: 0, rotate: -45 }}
                   animate={{ scale: 1, rotate: 0 }}
                   className="w-32 h-32 bg-neutral-800 rounded-3xl flex items-center justify-center shadow-lg border-2 border-rps-purple/50"
                >
                   {p1Choice && (() => {
                      const Icon = icons[p1Choice];
                      return <Icon className="w-16 h-16 text-rps-purple" />;
                   })()}
                </motion.div>
             ) : (
                <motion.div 
                   key="waiting-p1"
                   className="w-32 h-32 bg-neutral-900/50 rounded-3xl flex items-center justify-center border-2 border-dashed border-neutral-800"
                >
                   {p1Choice ? <div className="text-green-500 font-bold">Ready!</div> : <div className="text-neutral-500">Thinking...</div>}
                </motion.div>
             )}
           </AnimatePresence>
         </div>

         {/* Center vs/result */}
         <div className="flex-1 flex flex-col items-center justify-center">
           {showReveal && (
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-center absolute"
              >
                 <div className={cn(
                    "text-4xl font-black uppercase mb-4",
                    data.winner === 'draw' ? "text-yellow-500" : "text-rps-purple"
                 )}>
                    {data.winner === 'draw' ? 'Draw!' : `${room.players.find(p => p.id === data.winner)?.name} Wins!`}
                 </div>
                 
                 {/* Only show next round/rematch if series not over. Best of 5 means first to 3. */}
                 {data.players[p1.id].score === 3 || data.players[p2?.id]?.score === 3 ? (
                    <button 
                       onClick={() => sendAction('rematch')}
                       className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-neutral-200"
                    >
                       Play Again
                    </button>
                 ) : (
                    <button 
                       onClick={() => sendAction('next_round')}
                       className="px-6 py-3 bg-rps-purple text-white font-bold rounded-xl hover:bg-rps-purple/90"
                    >
                       Next Round
                    </button>
                 )}
              </motion.div>
           )}
         </div>

         {/* Player 2 Side */}
         <div className="flex flex-col items-center gap-4 flex-1">
           <AnimatePresence mode="wait">
             {showReveal ? (
                <motion.div 
                   key="reveal-p2"
                   initial={{ scale: 0, rotate: 45 }}
                   animate={{ scale: 1, rotate: 0 }}
                   className="w-32 h-32 bg-neutral-800 rounded-3xl flex items-center justify-center shadow-lg border-2 border-rps-purple/50"
                >
                   {p2Choice && (() => {
                      const Icon = icons[p2Choice];
                      return <Icon className="w-16 h-16 text-rps-purple" />;
                   })()}
                </motion.div>
             ) : (
                <motion.div 
                   key="waiting-p2"
                   className="w-32 h-32 bg-neutral-900/50 rounded-3xl flex items-center justify-center border-2 border-dashed border-neutral-800"
                >
                   {p2Choice ? <div className="text-green-500 font-bold">Ready!</div> : <div className="text-neutral-500">Thinking...</div>}
                </motion.div>
             )}
           </AnimatePresence>
         </div>

      </div>

      {/* Controls */}
      <div className="w-full max-w-md mt-12 bg-neutral-900/50 p-6 rounded-3xl border border-neutral-800 flex justify-center gap-6">
         {choices.map(choice => {
            const Icon = icons[choice];
            const isSelected = localChoice === choice;
            return (
               <button
                  key={choice}
                  onClick={() => handleChoice(choice)}
                  disabled={!!localChoice || showReveal}
                  className={cn(
                     "w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-300",
                     isSelected ? "bg-rps-purple text-white scale-110 shadow-[0_0_30px_rgba(139,92,246,0.3)]" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white",
                     localChoice && !isSelected && "opacity-50 scale-90"
                  )}
               >
                  <Icon className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase tracking-wider">{choice}</span>
               </button>
            )
         })}
      </div>
    </div>
  );
}
