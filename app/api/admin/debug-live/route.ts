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
  let apiInPlay: any = null
  let apiToday: any = null
  let apiError: any = null

  if (FD_KEY) {
    const today = new Date().toISOString().slice(0, 10)
    try {
      const [r1, r2] = await Promise.allSettled([
        axios.get('https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY,PAUSED', {
          headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
        }),
        axios.get(`https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`, {
          headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
        }),
      ])
      if (r1.status === 'fulfilled') {
        apiInPlay = (r1.value.data?.matches ?? []).map((m: any) => ({
          id: m.id, home: m.homeTeam?.name, away: m.awayTeam?.name,
          status: m.status, score: m.score?.fullTime, minute: m.minute,
        }))
      } else {
        apiError = { inPlay: (r1 as any).reason?.message }
      }
      if (r2.status === 'fulfilled') {
        apiToday = (r2.value.data?.matches ?? []).map((m: any) => ({
          id: m.id, home: m.homeTeam?.name, away: m.awayTeam?.name,
          status: m.status, score: m.score?.fullTime, minute: m.minute,
        }))
      } else {
        apiError = { ...apiError, today: (r2 as any).reason?.message }
      }
    } catch (e: any) {
      apiError = e.message
    }
  }

  return NextResponse.json({
    hasFdKey: !!FD_KEY,
    hasAfKey: !!process.env.FOOTBALL_API_KEY,
    now: new Date().toISOString(),
    liveMatches: matches.map(m => ({
      id: m.id, status: m.status,
      home: m.homeTeam.nameEn, away: m.awayTeam.nameEn,
      score: `${m.homeScore ?? '?'}:${m.awayScore ?? '?'}`,
      kickoffAt: m.kickoffAt, providerMatchId: m.providerMatchId,
    })),
    apiInPlay,
    apiToday,
    apiError,
  })
}
