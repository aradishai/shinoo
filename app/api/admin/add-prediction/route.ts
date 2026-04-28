import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, username, home, away, homeScore, awayScore } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { username } })
  if (!user) return NextResponse.json({ error: `user ${username} not found` }, { status: 404 })

  const homeTeam = await db.team.findUnique({ where: { code: home } })
  const awayTeam = await db.team.findUnique({ where: { code: away } })
  if (!homeTeam || !awayTeam) return NextResponse.json({ error: 'team not found' }, { status: 404 })

  const match = await db.match.findFirst({
    where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id }
  })
  if (!match) return NextResponse.json({ error: 'match not found' }, { status: 404 })

  const membership = await db.leagueMember.findFirst({ where: { userId: user.id } })
  if (!membership) return NextResponse.json({ error: 'user has no league' }, { status: 404 })

  const existing = await db.prediction.findFirst({
    where: { userId: user.id, matchId: match.id, leagueId: membership.leagueId }
  })

  if (existing) {
    await db.prediction.update({
      where: { id: existing.id },
      data: { predictedHomeScore: homeScore, predictedAwayScore: awayScore }
    })
    return NextResponse.json({ ok: true, action: 'updated', user: username, score: `${homeScore}-${awayScore}` })
  }

  await db.prediction.create({
    data: { userId: user.id, matchId: match.id, leagueId: membership.leagueId, predictedHomeScore: homeScore, predictedAwayScore: awayScore }
  })

  return NextResponse.json({ ok: true, action: 'created', user: username, score: `${homeScore}-${awayScore}` })
}
