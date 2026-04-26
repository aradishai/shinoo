import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import { ApiFootballProvider } from '@/lib/football-provider/api-football'

export const dynamic = 'force-dynamic'

let lastSyncTime = 0
const MIN_INTERVAL_MS = 60_000

const provider = new ApiFootballProvider()

async function syncLiveMatches() {
  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey || apiKey === 'your-api-football-key') return

  // Fetch all live matches from API-Football
  const liveMatches = await provider.getLiveMatches('')

  if (liveMatches.length === 0) return

  // Also fetch recently finished matches (last 24h) by checking each match individually
  // We match API-Football fixtures to our DB by kickoff time proximity (±30 min)
  const now = new Date()
  const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3h ago
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000)       // 30min ahead

  const dbMatches = await db.match.findMany({
    where: {
      kickoffAt: { gte: windowStart, lte: windowEnd },
      status: { in: ['SCHEDULED', 'LOCKED', 'LIVE', 'PAUSED'] },
    },
  })

  for (const apiMatch of liveMatches) {
    // Find the best matching DB match by kickoff time (within 30 min)
    const kickoff = apiMatch.kickoffAt
    const dbMatch = dbMatches.find((m) => {
      const diff = Math.abs(new Date(m.kickoffAt).getTime() - kickoff.getTime())
      return diff <= 30 * 60 * 1000
    })
    if (!dbMatch) continue

    const homeScore = apiMatch.homeScore ?? dbMatch.homeScore
    const awayScore = apiMatch.awayScore ?? dbMatch.awayScore

    await db.match.update({
      where: { id: dbMatch.id },
      data: { status: apiMatch.status, homeScore, awayScore },
    })

    if (homeScore !== null && awayScore !== null) {
      await recalculatePoints(dbMatch.id)
    }
  }
}

async function syncRecentlyFinished() {
  const apiKey = process.env.FOOTBALL_API_KEY
  if (!apiKey || apiKey === 'your-api-football-key') return

  // Find matches that should be finished (kicked off >110 min ago, still LIVE/PAUSED)
  const staleTime = new Date(Date.now() - 110 * 60 * 1000)
  const staleMatches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED'] }, kickoffAt: { lte: staleTime } },
  })

  for (const match of staleMatches) {
    if (!match.providerMatchId) continue
    const id = match.providerMatchId.replace(/^fd-/, '')
    const result = await provider.getMatchResult(id)
    if (!result) continue

    await db.match.update({
      where: { id: match.id },
      data: { status: result.status, homeScore: result.homeScore, awayScore: result.awayScore },
    })
    await recalculatePoints(match.id)
  }
}

async function lockExpiredMatches() {
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() } },
    data: { status: 'LOCKED' },
  })
}

async function autoFinishStaleMatches() {
  const staleTime = new Date(Date.now() - 120 * 60 * 1000)
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
      await syncLiveMatches()
      await syncRecentlyFinished()
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
