import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, home, away, minutesOpen = 30, status = 'SCHEDULED', homeScore, awayScore } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const homeTeam = await db.team.findUnique({ where: { code: home } })
  const awayTeam = await db.team.findUnique({ where: { code: away } })
  if (!homeTeam || !awayTeam) return NextResponse.json({ error: 'team not found' }, { status: 404 })

  const match = await db.match.findFirst({
    where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id }
  })
  if (!match) return NextResponse.json({ error: 'match not found' }, { status: 404 })

  const lockAt = new Date(Date.now() + minutesOpen * 60 * 1000)
  await db.match.update({
    where: { id: match.id },
    data: {
      status,
      lockAt,
      ...(homeScore !== undefined && { homeScore }),
      ...(awayScore !== undefined && { awayScore }),
    }
  })

  return NextResponse.json({ ok: true, match: `${home} vs ${away}`, status, lockAt })
}
