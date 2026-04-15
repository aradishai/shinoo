import { NextResponse } from 'next/server'
import {
  syncFixtures,
  syncLiveResults,
  updateMatchStatuses,
  recalculatePoints,
} from '@/lib/sync-service'

export async function POST(request: Request) {
  const syncSecret = request.headers.get('x-sync-secret')
  const expectedSecret = process.env.SYNC_SECRET

  if (!expectedSecret || syncSecret !== expectedSecret) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { action, matchId } = body as { action?: string; matchId?: string }

    if (action === 'fixtures') {
      await syncFixtures()
      return NextResponse.json({ message: 'סנכרון משחקים הושלם' })
    }

    if (action === 'live') {
      await syncLiveResults()
      return NextResponse.json({ message: 'סנכרון חי הושלם' })
    }

    if (action === 'statuses') {
      await updateMatchStatuses()
      return NextResponse.json({ message: 'עדכון סטטוסים הושלם' })
    }

    if (action === 'recalculate' && matchId) {
      await recalculatePoints(matchId)
      return NextResponse.json({ message: `חישוב נקודות עבור משחק ${matchId} הושלם` })
    }

    // Full sync
    await syncFixtures()
    await syncLiveResults()
    await updateMatchStatuses()

    return NextResponse.json({ message: 'סנכרון מלא הושלם' })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'שגיאה בסנכרון' }, { status: 500 })
  }
}
