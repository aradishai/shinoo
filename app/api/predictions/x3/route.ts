import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'X3 זמין רק לפני נעילת המשחק' }, { status: 400 })

  if ((prediction as any).x3Applied)
    return NextResponse.json({ error: 'X3 כבר הופעל על משחק זה' }, { status: 400 })

  if (prediction.x2Applied)
    return NextResponse.json({ error: 'לא ניתן לשלב X2 ו-X3' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { x3Stock: true } })
  if (!user || user.x3Stock < 1)
    return NextResponse.json({ error: 'אין לך X3 — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { x3Stock: { decrement: 1 } } })
  await db.prediction.update({ where: { id: predictionId }, data: { x3Applied: true } as any })

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, ...updatedUser })
}
