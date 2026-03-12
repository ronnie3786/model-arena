import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-blue-500 to-purple-600">
          Multiplayer Game Hub
        </h1>
        <p className="text-xl text-gray-400">Choose your game and challenge a friend or the AI.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Tic-Tac-Toe Card */}
        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 hover:border-green-500/50 transition-all duration-300 shadow-2xl shadow-green-900/10 flex flex-col items-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="w-32 h-32 mb-8 relative grid grid-cols-3 grid-rows-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-sm flex items-center justify-center text-2xl font-bold">
                {i % 2 === 0 ? <span className="text-green-400">X</span> : <span className="text-blue-400">O</span>}
              </div>
            ))}
          </div>
          
          <h2 className="text-3xl font-bold mb-6 text-white z-10">Tic-Tac-Toe</h2>
          <div className="flex flex-col w-full gap-3 z-10 mt-auto">
            <Link href="/ttt?mode=ai" className="w-full">
              <button className="w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors">
                Play vs AI
              </button>
            </Link>
            <Link href="/lobby?game=ttt" className="w-full">
              <button className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors shadow-lg shadow-green-900/20">
                Play with a Friend
              </button>
            </Link>
          </div>
        </div>

        {/* Rock Paper Scissors Card */}
        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 hover:border-purple-500/50 transition-all duration-300 shadow-2xl shadow-purple-900/10 flex flex-col items-center group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-48 h-32 mb-8 relative flex items-center justify-center space-x-2 text-6xl z-10">
            <span className="transform -rotate-12 transition-transform group-hover:rotate-0">✊</span>
            <span className="transform -translate-y-4 transition-transform group-hover:translate-y-0">✋</span>
            <span className="transform rotate-12 transition-transform group-hover:rotate-0">✌️</span>
          </div>
          <h2 className="text-3xl font-bold mb-6 text-white z-10">Rock Paper Scissors</h2>
          <div className="flex flex-col w-full gap-3 z-10 mt-auto">
            <Link href="/rps?mode=ai" className="w-full">
              <button className="w-full py-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors">
                Play vs AI
              </button>
            </Link>
            <Link href="/lobby?game=rps" className="w-full">
              <button className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors shadow-lg shadow-purple-900/20">
                Play with a Friend
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
