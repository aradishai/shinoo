import { NextResponse } from 'next/server'
import { runLiveSync, MIN_INTERVAL_MS } from '@/lib/live-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await runLiveSync()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[sync/live] Error:', error)
    return NextResponse.json({ synced: false, activeMatches: 0, nextSyncIn: MIN_INTERVAL_MS })
  }
}
