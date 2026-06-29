import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hasAnyPowerupApplied } from '@/lib/double-guard'

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId } = await request.json()
  if (!predictionId) return NextResponse.json({ error: 'חסר predictionId' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  // Must be before match locks
  if (!['SCHEDULED'].includes(prediction.match.status))
    return NextResponse.json({ error: 'PEEK זמין רק לפני נעילת המשחק' }, { status: 400 })

  const now = new Date()
  const lockAt = prediction.match.lockAt

  if (now >= lockAt)
    return NextResponse.json({ error: 'המשחק כבר ננעל' }, { status: 400 })

  if (hasAnyPowerupApplied(prediction))
    return NextResponse.json({ error: 'ניתן להפעיל לחצן אחד בלבד על כל משחק' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { peekStock: true, username: true } })
  if (!user || (user as any).peekStock < 1)
    return NextResponse.json({ error: 'אין לך PEEK — קנה בחנות' }, { status: 400 })

  // Extended lock: 45 minutes after normal lockAt
  const peekLockAt = new Date(lockAt.getTime() + 45 * 60 * 1000)

  await db.user.update({ where: { id: userId }, data: { peekStock: { decrement: 1 } } as any })
  await db.prediction.updateMany({
    where: { userId, matchId: prediction.matchId },
    data: { peekApplied: true, peekLockAt } as any,
  })

  // Fetch other league members' predictions for this match
  const otherPredictions = await db.prediction.findMany({
    where: { matchId: prediction.matchId, leagueId: prediction.leagueId, userId: { not: userId } },
    select: {
      predictedHomeScore: true,
      predictedAwayScore: true,
      user: { select: { username: true, avatar: true } },
    },
  })

  const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { peekStock: true } })

  return NextResponse.json({
    success: true,
    peekStock: (updatedUser as any)?.peekStock ?? 0,
    peekLockAt,
    otherPredictions,
  })
}
