import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tournament = await db.tournament.findUnique({ where: { slug } })
  if (!tournament) return NextResponse.json({ error: 'tournament not found' }, { status: 404 })

  const matches = await db.match.findMany({ where: { tournamentId: tournament.id }, select: { id: true } })
  const matchIds = matches.map(m => m.id)

  await db.predictionPoints.deleteMany({ where: { prediction: { matchId: { in: matchIds } } } })
  await db.prediction.deleteMany({ where: { matchId: { in: matchIds } } })
  await db.match.deleteMany({ where: { tournamentId: tournament.id } })
  await db.tournament.delete({ where: { id: tournament.id } })

  return NextResponse.json({ ok: true, deleted: slug, matchCount: matchIds.length })
}
