import { NextResponse } from 'next/server'
import { updateMatchStatuses, syncLiveResults } from '@/lib/sync-service'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// In-memory rate limit — don't hammer the external API
let lastSyncTime = 0
const MIN_INTERVAL_MS = 60_000 // max once per 60s

export async function GET() {
  const userId = undefined // public endpoint used by client polling

  try {
    const now = Date.now()
    const timeSinceLast = now - lastSyncTime

    // Check if there are any active matches worth syncing
    const activeMatches = await db.match.count({
      where: { status: { in: ['LIVE', 'LOCKED'] } },
    })

    let synced = false
    if (activeMatches > 0 && timeSinceLast >= MIN_INTERVAL_MS) {
      lastSyncTime = now
      await syncLiveResults()
      await updateMatchStatuses()
      synced = true
    }

    return NextResponse.json({
      synced,
      activeMatches,
      nextSyncIn: synced ? MIN_INTERVAL_MS : Math.max(0, MIN_INTERVAL_MS - timeSinceLast),
    })
  } catch (error) {
    console.error('[sync/live] Error:', error)
    return NextResponse.json({ synced: false, activeMatches: 0, nextSyncIn: MIN_INTERVAL_MS })
  }
}
