import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function WaitingRoom({ roomId, room, connected }: { roomId: string, room: any, connected: boolean }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(120);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (room && room.expiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, Math.floor((room.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
           router.push('/');
        }
      };
      
      const interval = setInterval(updateTimer, 1000);
      updateTimer();
      return () => clearInterval(interval);
    }
  }, [room, router]);

  const copyLink = () => {
    const url = `${window.location.origin}/lobby?code=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-6">
      <div className="bg-gray-900 rounded-3xl p-10 border border-gray-800 shadow-2xl flex flex-col items-center max-w-lg w-full text-center">
        <h2 className="text-3xl font-bold mb-4">Waiting for Player...</h2>
        
        <div className="my-8 w-full p-6 bg-gray-800 rounded-2xl border border-gray-700">
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-wider font-semibold">Room Code</p>
          <p className="text-6xl font-mono font-bold tracking-[0.2em]">{roomId}</p>
        </div>
        
        <button
          onClick={copyLink}
          className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 mb-8"
        >
          {copied ? 'Copied!' : 'Copy Invite Link'}
        </button>
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-gray-400">
             <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
             <span>Waiting for opponent to join...</span>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
             Room expires in <span className="font-mono text-white">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
