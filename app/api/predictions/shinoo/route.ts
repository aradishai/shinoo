import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MAX_USES = 2

// adjustment: { team: 'home' | 'away', delta: 1 | -1 }
export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId, team, delta } = await request.json()
  if (!predictionId || !team || !delta)
    return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })

  if (!['home', 'away'].includes(team) || ![-1, 1].includes(delta))
    return NextResponse.json({ error: 'פרמטרים לא תקינים' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: true },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (prediction.match.status !== 'PAUSED')
    return NextResponse.json({ error: 'SHINOO זמין רק בהפסקה' }, { status: 400 })

  if (prediction.shinooApplied)
    return NextResponse.json({ error: 'SHINOO כבר הופעל על משחק זה' }, { status: 400 })

  const newHome = prediction.predictedHomeScore + (team === 'home' ? delta : 0)
  const newAway = prediction.predictedAwayScore + (team === 'away' ? delta : 0)

  if (newHome < 0 || newAway < 0)
    return NextResponse.json({ error: 'לא ניתן להוריד מתחת ל-0' }, { status: 400 })

  const matchday = parseInt(prediction.match.round?.replace(/\D/g, '') || '0')

  const usageCount = await db.powerupUsage.count({
    where: { userId, leagueId: prediction.leagueId, matchday, type: 'SHINOO' },
  })

  if (usageCount >= MAX_USES)
    return NextResponse.json({ error: `השתמשת בSHINOO פעמיים במחזור ${matchday}` }, { status: 400 })

  await db.prediction.update({
    where: { id: predictionId },
    data: { predictedHomeScore: newHome, predictedAwayScore: newAway, shinooApplied: true },
  })
  await db.powerupUsage.create({ data: { id: `shinoo-${predictionId}`, userId, leagueId: prediction.leagueId, matchday, type: 'SHINOO' } })

  return NextResponse.json({ success: true, newHome, newAway, usedThisMatchday: usageCount + 1, remaining: MAX_USES - usageCount - 1 })
}
