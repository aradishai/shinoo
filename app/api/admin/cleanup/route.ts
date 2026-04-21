import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Reset corrupted scores (1-4 Liverpool/Swansea garbage) on today's matches
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const reset = await db.match.updateMany({
    where: {
      kickoffAt: { gte: today },
      homeScore: 4,
      awayScore: 1,
    },
    data: { homeScore: null, awayScore: null, status: 'LOCKED' },
  })

  // Also delete old La Liga matches with no predictions
  const deleted = await db.match.deleteMany({
    where: {
      tournament: { slug: 'laliga-2025-2026' },
      kickoffAt: { lt: today },
      predictions: { none: {} },
    },
  })

  return NextResponse.json({ reset: reset.count, deleted: deleted.count })
}
