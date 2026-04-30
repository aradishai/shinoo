import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (slug === 'debug') {
    const total = await db.match.count()
    const all = await db.match.findMany({
      select: { id: true, round: true, status: true, kickoffAt: true, tournamentId: true },
      orderBy: { kickoffAt: 'desc' },
      take: 100,
    })
    const tournaments = await db.tournament.findMany({ select: { id: true, name: true, slug: true } })
    return NextResponse.json({ total, tournaments, matches: all })
  }

  // Find tournament by slug
  const tournament = await db.tournament.findFirst({ where: { slug: { contains: slug } } })
  if (!tournament) return NextResponse.json({ error: 'tournament not found', slug }, { status: 404 })

  const matches = await db.match.findMany({ where: { tournamentId: tournament.id }, select: { id: true } })
  const matchIds = matches.map(m => m.id)

  if (matchIds.length === 0) {
    // Delete the empty tournament anyway
    await db.tournament.delete({ where: { id: tournament.id } })
    return NextResponse.json({ ok: true, matchCount: 0, tournamentDeleted: true })
  }

  await db.predictionPoints.deleteMany({ where: { prediction: { matchId: { in: matchIds } } } })
  await db.prediction.deleteMany({ where: { matchId: { in: matchIds } } })
  await db.match.deleteMany({ where: { tournamentId: tournament.id } })
  await db.tournament.delete({ where: { id: tournament.id } })

  return NextResponse.json({ ok: true, matchCount: matchIds.length, tournamentDeleted: true })
}
