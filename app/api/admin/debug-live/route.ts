import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

export async function GET() {
  const matches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'asc' },
  })

  const FD_KEY = process.env.FOOTBALL_DATA_API_KEY
  let apiScheduled: any = null
  let apiError: any = null

  if (FD_KEY) {
    const fromDate = new Date().toISOString().slice(0, 10)
    const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    try {
      const r = await axios.get(`https://api.football-data.org/v4/competitions/WC/matches?status=SCHEDULED,TIMED&dateFrom=${fromDate}&dateTo=${toDate}`, {
        headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
      })
      apiScheduled = (r.data?.matches ?? []).map((m: any) => ({
        id: m.id,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        homeTla: m.homeTeam?.tla,
        awayTla: m.awayTeam?.tla,
        status: m.status,
        stage: m.stage,
        date: m.utcDate,
      }))
    } catch (e: any) {
      apiError = e.message
    }
  }

  return NextResponse.json({
    hasFdKey: !!FD_KEY,
    now: new Date().toISOString(),
    liveMatches: matches.map(m => ({
      id: m.id, status: m.status,
      home: m.homeTeam.nameEn, away: m.awayTeam.nameEn,
      score: `${m.homeScore ?? '?'}:${m.awayScore ?? '?'}`,
      kickoffAt: m.kickoffAt, providerMatchId: m.providerMatchId,
    })),
    apiScheduled,
    apiError,
  })
}
