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
  '1H': 'LIVE', 'HT': 'LIVE', '2H': 'LIVE', 'ET': 'LIVE',
  'Match Postponed': 'POSTPONED',
  'Match Cancelled': 'CANCELLED',
}

async function syncLaLigaLive() {
  // Try live scores first
  let events: any[] = []
  try {
    const liveRes = await axios.get(`${TSDB_BASE}/livescore.php`, {
      params: { l: TSDB_LA_LIGA },
      timeout: 8000,
    })
    events = liveRes.data?.events ?? []
  } catch {
    // livescore might not be available on free tier — fall through
  }

  // If no live events, check recently-started LOCKED matches via lookupevent
  if (events.length === 0) {
    const lockedMatches = await db.match.findMany({
      where: {
        status: { in: ['LOCKED', 'LIVE'] },
        tournament: { slug: 'laliga-2025-2026' },
        kickoffAt: { lte: new Date() },
        providerMatchId: { not: null },
      },
    })

    for (const match of lockedMatches) {
      if (!match.providerMatchId) continue
      try {
        const res = await axios.get(`${TSDB_BASE}/lookupevent.php`, {
          params: { id: match.providerMatchId },
          timeout: 8000,
        })
        const e = res.data?.events?.[0]
        if (!e) continue

        const status = TSDB_STATUS_MAP[e.strStatus ?? ''] ?? match.status
        const homeScore = e.intHomeScore !== null && e.intHomeScore !== '' ? Number(e.intHomeScore) : match.homeScore
        const awayScore = e.intAwayScore !== null && e.intAwayScore !== '' ? Number(e.intAwayScore) : match.awayScore

        await db.match.update({
          where: { id: match.id },
          data: { status, homeScore, awayScore },
        })

        if (status === 'FINISHED' && homeScore !== null && awayScore !== null && match.status !== 'FINISHED') {
          await recalculatePoints(match.id)
        }
      } catch {
        // continue to next match
      }
    }
    return
  }

  // Process live events from livescore endpoint
  for (const e of events) {
    const match = await db.match.findUnique({
      where: { providerMatchId: String(e.idEvent) },
    })
    if (!match) continue

    const status = TSDB_STATUS_MAP[e.strStatus ?? ''] ?? 'LIVE'
    const homeScore = Number(e.intHomeScore) || 0
    const awayScore = Number(e.intAwayScore) || 0

    await db.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore },
    })

    if (status === 'FINISHED' && match.status !== 'FINISHED') {
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
