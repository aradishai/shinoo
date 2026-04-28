import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

let lastSyncTime = 0
const MIN_INTERVAL_MS = 60_000

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY

const FD_STATUS_MAP: Record<string, string> = {
  'TIMED': 'SCHEDULED',
  'SCHEDULED': 'SCHEDULED',
  'IN_PLAY': 'LIVE',
  'PAUSED': 'PAUSED',
  'FINISHED': 'FINISHED',
  'SUSPENDED': 'POSTPONED',
  'POSTPONED': 'POSTPONED',
  'CANCELLED': 'CANCELLED',
  'AWARDED': 'FINISHED',
}

async function syncFootballData() {
  if (!FD_KEY) return

  const competitions = ['PD', 'CL']
  const fetchResults = await Promise.allSettled(
    competitions.flatMap(comp => [
      axios.get(`${FD_API}/competitions/${comp}/matches?status=IN_PLAY,PAUSED`, {
        headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
      }),
      axios.get(`${FD_API}/competitions/${comp}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
      }),
    ])
  )

  const liveMatches = fetchResults
    .filter((_, i) => i % 2 === 0)
    .flatMap(r => r.status === 'fulfilled' ? (r.value.data?.matches ?? []) : [])

  const recentMatches = fetchResults
    .filter((_, i) => i % 2 === 1)
    .flatMap(r => r.status === 'fulfilled' ? (r.value.data?.matches ?? []) : [])

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentFinished = recentMatches.filter((m: any) => new Date(m.lastUpdated) > cutoff)

  const allMatches = [...liveMatches, ...recentFinished]

  for (const m of allMatches) {
    // Try to find by providerMatchId first, then fall back to team name matching
    let match = await db.match.findUnique({
      where: { providerMatchId: `fd-${m.id}` },
    })

    if (!match) {
      const homeTeam = await db.team.findFirst({
        where: { nameEn: { contains: m.homeTeam?.name?.split(' ')[0] ?? '__' } }
      })
      const awayTeam = await db.team.findFirst({
        where: { nameEn: { contains: m.awayTeam?.name?.split(' ')[0] ?? '__' } }
      })
      if (homeTeam && awayTeam) {
        const kickoffDate = new Date(m.utcDate)
        const from = new Date(kickoffDate.getTime() - 2 * 60 * 60 * 1000)
        const to = new Date(kickoffDate.getTime() + 2 * 60 * 60 * 1000)
        match = await db.match.findFirst({
          where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, kickoffAt: { gte: from, lte: to }, providerMatchId: null }
        }) ?? null
        // Save the providerMatchId so future syncs are instant
        if (match) {
          await db.match.update({ where: { id: match.id }, data: { providerMatchId: `fd-${m.id}` } })
        }
      }
    }

    if (!match) continue

    const status = FD_STATUS_MAP[m.status] ?? match.status
    const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? match.homeScore
    const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? match.awayScore
    const minute = m.minute ?? null
    const hasScore = homeScore !== null && awayScore !== null

    await db.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore, minute },
    })

    if (hasScore) {
      await recalculatePoints(match.id)
    }
  }
}

async function lockExpiredMatches() {
  // Only auto-lock matches that have a providerMatchId (synced from API)
  // Manually created matches (CL seeds) are managed via admin endpoints
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() }, providerMatchId: { not: null } },
    data: { status: 'LOCKED' },
  })
}

async function autoFinishStaleMatches() {
  const staleTime = new Date(Date.now() - 110 * 60 * 1000)
  await db.match.updateMany({
    where: { status: { in: ['LIVE', 'PAUSED'] }, kickoffAt: { lte: staleTime } },
    data: { status: 'FINISHED' },
  })
}

async function recalculateMissingPoints() {
  const finished = await db.match.findMany({
    where: {
      status: { in: ['FINISHED', 'PAUSED', 'LIVE'] },
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: {} },
    },
    select: { id: true },
  })
  for (const m of finished) {
    await recalculatePoints(m.id)
  }
}

export async function GET() {
  try {
    const now = Date.now()
    const timeSinceLast = now - lastSyncTime

    const activeCount = await db.match.count({
      where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
    })

    let synced = false
    if (timeSinceLast >= MIN_INTERVAL_MS) {
      lastSyncTime = now
      await lockExpiredMatches()
      await syncFootballData()
      await autoFinishStaleMatches()
      await recalculateMissingPoints()
      synced = true
    }

    return NextResponse.json({
      synced,
      activeMatches: activeCount,
      nextSyncIn: synced ? MIN_INTERVAL_MS : Math.max(0, MIN_INTERVAL_MS - timeSinceLast),
    })
  } catch (error) {
    console.error('[sync/live] Error:', error)
    return NextResponse.json({ synced: false, activeMatches: 0, nextSyncIn: MIN_INTERVAL_MS })
  }
}
