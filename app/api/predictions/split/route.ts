import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId, splitHomeScore2, splitAwayScore2 } = await request.json()
  if (!predictionId || splitHomeScore2 === undefined || splitAwayScore2 === undefined)
    return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })

  if (typeof splitHomeScore2 !== 'number' || typeof splitAwayScore2 !== 'number' ||
      splitHomeScore2 < 0 || splitAwayScore2 < 0 || splitHomeScore2 > 20 || splitAwayScore2 > 20)
    return NextResponse.json({ error: 'תוצאה לא תקינה' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: true },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'ספליט זמין רק לפני נעילת המשחק' }, { status: 400 })

  if ((prediction as any).splitApplied)
    return NextResponse.json({ error: 'ספליט כבר הופעל על משחק זה' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { splitStock: true } })
  if (!user || user.splitStock < 1)
    return NextResponse.json({ error: 'אין לך ספליט — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { splitStock: { decrement: 1 } } })
  await db.prediction.update({
    where: { id: predictionId },
    data: { splitApplied: true, splitHomeScore2, splitAwayScore2 } as any,
  })

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, ...updatedUser })
}
