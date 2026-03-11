'use client'

import { Suspense } from 'react'
import RPSGameContent from './content'

export default function RPSGame() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted animate-pulse">Loading...</div>
      </div>
    }>
      <RPSGameContent />
    </Suspense>
  )
}
