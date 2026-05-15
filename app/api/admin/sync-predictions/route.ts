import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  }

  const memberships = await db.leagueMember.findMany({
    select: { userId: true, leagueId: true },
  })

  let copied = 0
  for (const { userId, leagueId } of memberships) {
    const openPredictions = await db.prediction.findMany({
      where: {
        userId,
        leagueId: { not: leagueId },
        match: { status: { notIn: ['FINISHED', 'CANCELLED', 'POSTPONED'] } },
      },
      distinct: ['matchId'],
      orderBy: { createdAt: 'asc' },
    })
    for (const pred of openPredictions) {
      await db.prediction.upsert({
        where: { userId_leagueId_matchId: { userId, leagueId, matchId: pred.matchId } },
        update: {},
        create: {
          userId,
          leagueId,
          matchId: pred.matchId,
          predictedHomeScore: pred.predictedHomeScore,
          predictedAwayScore: pred.predictedAwayScore,
        },
      }).catch(() => {})
      copied++
    }
  }

  return NextResponse.json({ ok: true, copied })
}
