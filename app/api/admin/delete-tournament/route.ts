import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Find matches by round (partial match to handle variants like "חצי גמר | רגל 1")
  const matches = await db.match.findMany({ where: { round: { contains: slug } }, select: { id: true, round: true } })
  const matchIds = matches.map(m => m.id)
  if (matchIds.length === 0) {
    // Debug: return all rounds to diagnose
    const allRounds = await db.match.findMany({ select: { round: true }, distinct: ['round'] })
    return NextResponse.json({ error: 'no matches found', slug, availableRounds: allRounds.map(m => m.round) }, { status: 404 })
  }

  await db.predictionPoints.deleteMany({ where: { prediction: { matchId: { in: matchIds } } } })
  await db.prediction.deleteMany({ where: { matchId: { in: matchIds } } })
  await db.match.deleteMany({ where: { id: { in: matchIds } } })

  return NextResponse.json({ ok: true, matchCount: matchIds.length })
}
