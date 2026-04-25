import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MAX_USES = 2

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId } = await request.json()
  if (!predictionId) return NextResponse.json({ error: 'חסר predictionId' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: true },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (!['LIVE', 'PAUSED'].includes(prediction.match.status))
    return NextResponse.json({ error: 'X2 זמין רק במהלך משחק' }, { status: 400 })

  const kickoff = prediction.match.kickoffAt
  const now = new Date()
  const windowStart = new Date(kickoff.getTime() + 45 * 60 * 1000)
  const windowEnd = new Date(kickoff.getTime() + 65 * 60 * 1000)
  if (now < windowStart || now > windowEnd)
    return NextResponse.json({ error: 'X2 זמין רק בין דקה 45 ל-65' }, { status: 400 })

  if (prediction.shinooApplied)
    return NextResponse.json({ error: 'לא ניתן להשתמש ב-X2 ובשינוי על אותו משחק' }, { status: 400 })

  if (prediction.x2Applied)
    return NextResponse.json({ error: 'X2 כבר הופעל על משחק זה' }, { status: 400 })

  const matchday = parseInt(prediction.match.round?.replace(/\D/g, '') || '0')

  const usageCount = await db.powerupUsage.count({
    where: { userId, leagueId: prediction.leagueId, matchday, type: 'X2' },
  })

  if (usageCount >= MAX_USES)
    return NextResponse.json({ error: `השתמשת בX2 פעמיים במחזור ${matchday}` }, { status: 400 })

  await db.prediction.update({ where: { id: predictionId }, data: { x2Applied: true } })
  await db.powerupUsage.create({ data: { id: `x2-${predictionId}`, userId, leagueId: prediction.leagueId, matchday, type: 'X2' } })

  return NextResponse.json({ success: true, usedThisMatchday: usageCount + 1, remaining: MAX_USES - usageCount - 1 })
}
