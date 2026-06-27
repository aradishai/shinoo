import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'
import { isInDoubleEntry, hasAnyPowerupApplied } from '@/lib/double-guard'

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

  if (await isInDoubleEntry(predictionId))
    return NextResponse.json({ error: 'לא ניתן לשלב לחצן עם DOUBLE' }, { status: 400 })

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'גולס+ זמין רק לפני נעילת המשחק' }, { status: 400 })

  if (hasAnyPowerupApplied(prediction))
    return NextResponse.json({ error: 'ניתן להפעיל לחצן אחד בלבד על כל משחק' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { goalsStock: true, username: true } })
  if (!user || user.goalsStock < 1)
    return NextResponse.json({ error: 'אין לך גולס+ — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { goalsStock: { decrement: 1 } } })
  await db.prediction.updateMany({ where: { userId, matchId: prediction.matchId }, data: { goalsApplied: true } as any })

  await postSystemMessage(
    prediction.leagueId,
    userId,
    `${user.username} הפעיל גולס+ על ${prediction.match.homeTeam.nameHe} נגד ${prediction.match.awayTeam.nameHe}`
  )

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, ...updatedUser })
}
