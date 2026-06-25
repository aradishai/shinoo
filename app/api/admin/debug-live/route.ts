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

  let apiData: any = null
  const FD_KEY = process.env.FOOTBALL_DATA_API_KEY
  if (FD_KEY) {
    try {
      const res = await axios.get('https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY,PAUSED', {
        headers: { 'X-Auth-Token': FD_KEY },
        timeout: 8000,
      })
      apiData = (res.data?.matches ?? []).map((m: any) => ({
        id: m.id,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        status: m.status,
        score: m.score?.fullTime,
        halfTime: m.score?.halfTime,
        minute: m.minute,
      }))
    } catch (e: any) {
      apiData = { error: e.message, status: e.response?.status }
    }
  }

  return NextResponse.json({
    hasFdKey: !!FD_KEY,
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
    apiInPlay: apiData,
  })
}
