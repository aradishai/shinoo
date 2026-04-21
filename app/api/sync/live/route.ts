import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

let lastSyncTime = 0
const MIN_INTERVAL_MS = 60_000

const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const TSDB_LA_LIGA = 4335

const TSDB_STATUS_MAP: Record<string, string> = {
  'Not Started': 'SCHEDULED',
  'Match Finished': 'FINISHED',
  'After Extra Time': 'FINISHED',
  'After Penalties': 'FINISHED',
  'FT': 'FINISHED', 'AET': 'FINISHED', 'PEN': 'FINISHED',
  '1H': 'LIVE', 'HT': 'LIVE', '2H': 'LIVE', 'ET': 'LIVE', 'BT': 'LIVE', 'P': 'LIVE',
  'Match Postponed': 'POSTPONED', 'POSTP': 'POSTPONED',
  'Match Cancelled': 'CANCELLED', 'CANC': 'CANCELLED', 'ABD': 'CANCELLED',
}

async function syncLaLigaLive() {
  // Fetch next/current events from the league — these have correct IDs and scores
  let events: any[] = []
  try {
    const res = await axios.get(`${TSDB_BASE}/eventsnextleague.php`, {
      params: { id: TSDB_LA_LIGA },
      timeout: 8000,
    })
    events = res.data?.events ?? []
  } catch {
    return
  }

  for (const e of events) {
    if (!e.idEvent) continue
    const match = await db.match.findUnique({
      where: { providerMatchId: String(e.idEvent) },
    })
    if (!match) continue

    const status = TSDB_STATUS_MAP[e.strStatus ?? ''] ?? match.status
    const hasScore = e.intHomeScore !== null && e.intHomeScore !== '' && e.intAwayScore !== null && e.intAwayScore !== ''
    const homeScore = hasScore ? Number(e.intHomeScore) : match.homeScore
    const awayScore = hasScore ? Number(e.intAwayScore) : match.awayScore
    const minute = e.strProgress ? parseInt(e.strProgress) || null : null

    await db.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore, ...(minute !== null ? { minute } : {}) },
    })

    if (hasScore) {
      await recalculatePoints(match.id)
    }
  }
}

// Auto-lock matches that have passed their lockAt time
async function lockExpiredMatches() {
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() } },
    data: { status: 'LOCKED' },
  })
}

async function recalculateMissingPoints() {
  const finishedWithPredictions = await db.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: { points: null } },
    },
    select: { id: true },
  })
  for (const m of finishedWithPredictions) {
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
      await recalculateMissingPoints()
      if (activeCount > 0) {
        await syncLaLigaLive()
      }
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
