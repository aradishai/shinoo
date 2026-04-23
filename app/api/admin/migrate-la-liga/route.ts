import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY!

const HEBREW_NAMES: Record<string, string> = {
  ATH: 'אתלטיק בילבאו',
  ATL: 'אתלטיקו מדריד',
  OSA: 'אוסאסונה',
  ESP: 'אספניול',
  FCB: 'ברצלונה',
  GET: 'חטאפה',
  RMA: 'ריאל מדריד',
  RAY: 'ראיו ויאקאנו',
  LEV: 'לבאנטה',
  MAL: 'מאיורקה',
  BET: 'ריאל בטיס',
  RSO: 'ריאל סוסיאדד',
  VIL: 'וילאריאל',
  VAL: 'ולנסיה',
  ALA: 'אלאבס',
  ELC: 'אלצ׳ה',
  GIR: 'ג׳ירונה',
  CEL: 'סלטה ויגו',
  SEV: 'סביליה',
  OVI: 'ריאל אוביידו',
}

export async function GET() {
  try {
    // 1. Fetch all remaining La Liga matches
    const res = await axios.get(`${FD_API}/competitions/PD/matches?status=SCHEDULED,TIMED`, {
      headers: { 'X-Auth-Token': FD_KEY },
    })
    const matches = res.data.matches as any[]

    // 2. Delete old League One tournament data (cascades to matches → predictions → points)
    const oldTournaments = await db.tournament.findMany({
      where: { slug: { not: 'la-liga-2025-26' } },
      select: { id: true },
    })
    for (const t of oldTournaments) {
      const matchIds = await db.match.findMany({ where: { tournamentId: t.id }, select: { id: true } })
      const mIds = matchIds.map(m => m.id)
      if (mIds.length > 0) {
        const predIds = await db.prediction.findMany({ where: { matchId: { in: mIds } }, select: { id: true } })
        const pIds = predIds.map(p => p.id)
        if (pIds.length > 0) await db.predictionPoints.deleteMany({ where: { predictionId: { in: pIds } } })
        await db.prediction.deleteMany({ where: { matchId: { in: mIds } } })
        await db.match.deleteMany({ where: { tournamentId: t.id } })
      }
      await db.tournament.delete({ where: { id: t.id } })
    }

    // 3. Delete players and teams with no matches
    await db.player.deleteMany({})
    await db.team.deleteMany({
      where: {
        homeMatches: { none: {} },
        awayMatches: { none: {} },
      },
    })

    // 4. Clear any leftover points
    await db.predictionPoints.deleteMany({})

    // 5. Upsert La Liga tournament
    const tournament = await db.tournament.upsert({
      where: { slug: 'la-liga-2025-26' },
      update: { isActive: true },
      create: {
        name: 'La Liga 2025/26',
        nameHe: 'ליגה ספרדית 2025/26',
        slug: 'la-liga-2025-26',
        type: 'league',
        season: '2025/26',
        isActive: true,
      },
    })

    // 6. Upsert teams and insert matches
    let inserted = 0
    for (const m of matches) {
      const homeData = m.homeTeam
      const awayData = m.awayTeam

      const homeTeam = await db.team.upsert({
        where: { code: homeData.tla },
        update: { flagUrl: homeData.crest },
        create: {
          nameEn: homeData.shortName,
          nameHe: HEBREW_NAMES[homeData.tla] || homeData.shortName,
          code: homeData.tla,
          flagUrl: homeData.crest,
        },
      })

      const awayTeam = await db.team.upsert({
        where: { code: awayData.tla },
        update: { flagUrl: awayData.crest },
        create: {
          nameEn: awayData.shortName,
          nameHe: HEBREW_NAMES[awayData.tla] || awayData.shortName,
          code: awayData.tla,
          flagUrl: awayData.crest,
        },
      })

      const kickoffAt = new Date(m.utcDate)
      const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000) // 1 hour before

      await db.match.upsert({
        where: { providerMatchId: `fd-${m.id}` },
        update: { status: 'SCHEDULED', kickoffAt, lockAt },
        create: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt,
          lockAt,
          status: 'SCHEDULED',
          providerMatchId: `fd-${m.id}`,
          round: `מחזור ${m.matchday}`,
        },
      })
      inserted++
    }

    return NextResponse.json({ success: true, inserted, tournament: tournament.name })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
