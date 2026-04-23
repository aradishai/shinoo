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
  'PAUSED': 'LIVE',
  'FINISHED': 'FINISHED',
  'SUSPENDED': 'POSTPONED',
  'POSTPONED': 'POSTPONED',
  'CANCELLED': 'CANCELLED',
  'AWARDED': 'FINISHED',
}

async function syncFootballData() {
  if (!FD_KEY) return

  const [liveRes, recentRes] = await Promise.allSettled([
    axios.get(`${FD_API}/competitions/PD/matches?status=IN_PLAY,PAUSED`, {
      headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
    }),
    axios.get(`${FD_API}/competitions/PD/matches?status=FINISHED`, {
      headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
    }),
  ])

  const liveMatches = liveRes.status === 'fulfilled' ? (liveRes.value.data?.matches ?? []) : []
  const recentMatches = recentRes.status === 'fulfilled' ? (recentRes.value.data?.matches ?? []) : []

  // Recent finished matches (last 24 hours only)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentFinished = recentMatches.filter((m: any) => new Date(m.lastUpdated) > cutoff)

  const allMatches = [...liveMatches, ...recentFinished]

  for (const m of allMatches) {
    const match = await db.match.findUnique({
      where: { providerMatchId: `fd-${m.id}` },
    })
    if (!match) continue

    const status = FD_STATUS_MAP[m.status] ?? match.status
    const homeScore = m.score?.fullTime?.home ?? match.homeScore
    const awayScore = m.score?.fullTime?.away ?? match.awayScore
    const hasScore = homeScore !== null && awayScore !== null

    await db.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore },
    })

    if (hasScore && status === 'FINISHED') {
      await recalculatePoints(match.id)
    }
  }
}

async function lockExpiredMatches() {
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() } },
    data: { status: 'LOCKED' },
  })
}

async function autoFinishStaleMatches() {
  const staleTime = new Date(Date.now() - 110 * 60 * 1000)
  await db.match.updateMany({
    where: { status: 'LIVE', kickoffAt: { lte: staleTime } },
    data: { status: 'FINISHED' },
  })
}

async function recalculateMissingPoints() {
  const finished = await db.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: { points: null } },
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
      where: { status: { in: ['LIVE', 'LOCKED'] } },
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
