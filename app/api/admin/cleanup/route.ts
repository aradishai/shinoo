import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculatePoints } from '@/lib/sync-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Delete ALL prediction points so we start fresh
  await db.predictionPoints.deleteMany({})

  // Recalculate only for FINISHED matches with valid scores
  const finishedMatches = await db.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true },
  })

  for (const m of finishedMatches) {
    await recalculatePoints(m.id)
  }

  return NextResponse.json({ reset: true, recalculated: finishedMatches.length })
}
