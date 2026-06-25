import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const matches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'asc' },
  })

  return NextResponse.json({
    hasFdKey: !!process.env.FOOTBALL_DATA_API_KEY,
    hasAfKey: !!process.env.FOOTBALL_API_KEY,
    liveMatches: matches.map(m => ({
      id: m.id,
      status: m.status,
      home: m.homeTeam.nameEn,
      away: m.awayTeam.nameEn,
      score: `${m.homeScore ?? '?'}:${m.awayScore ?? '?'}`,
      kickoffAt: m.kickoffAt,
      providerMatchId: m.providerMatchId,
    })),
  })
}
