'use client'

import { Suspense } from 'react'
import TicTacToeGameContent from './content'

export default function TicTacToeGame() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading...</div>
      </div>
    }>
      <TicTacToeGameContent />
    </Suspense>
  )
}
