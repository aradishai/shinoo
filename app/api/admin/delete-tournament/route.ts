import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug, teamCodes } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let matchIds: string[] = []

  if (teamCodes && Array.isArray(teamCodes)) {
    // Delete by team codes — find all matches involving any of these teams
    const teams = await db.team.findMany({ where: { code: { in: teamCodes } } })
    const teamIds = teams.map(t => t.id)
    const matches = await db.match.findMany({
      where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
      select: { id: true },
    })
    matchIds = matches.map(m => m.id)
  } else if (slug) {
    const tournament = await db.tournament.findUnique({ where: { slug } })
    if (!tournament) return NextResponse.json({ error: 'tournament not found' }, { status: 404 })
    const matches = await db.match.findMany({ where: { tournamentId: tournament.id }, select: { id: true } })
    matchIds = matches.map(m => m.id)
    await db.predictionPoints.deleteMany({ where: { prediction: { matchId: { in: matchIds } } } })
    await db.prediction.deleteMany({ where: { matchId: { in: matchIds } } })
    await db.match.deleteMany({ where: { tournamentId: tournament.id } })
    await db.tournament.delete({ where: { id: tournament.id } })
    return NextResponse.json({ ok: true, deleted: slug, matchCount: matchIds.length })
  }

  if (matchIds.length === 0) return NextResponse.json({ error: 'no matches found' }, { status: 404 })

  await db.predictionPoints.deleteMany({ where: { prediction: { matchId: { in: matchIds } } } })
  await db.prediction.deleteMany({ where: { matchId: { in: matchIds } } })
  await db.match.deleteMany({ where: { id: { in: matchIds } } })

  return NextResponse.json({ ok: true, matchCount: matchIds.length })
}
