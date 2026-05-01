import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getRoundNumber(round: string | null | undefined): number {
  if (!round) return 0
  const digits = round.replace(/\D/g, '')
  if (digits) return parseInt(digits)
  if (round.includes('גמר')) return 100
  return 0
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId } = await request.json()
  if (!predictionId) return NextResponse.json({ error: 'חסר predictionId' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: { include: { tournament: true } } },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (!['LIVE', 'PAUSED'].includes(prediction.match.status))
    return NextResponse.json({ error: 'X2 זמין רק במהלך משחק' }, { status: 400 })

  const kickoff = prediction.match.kickoffAt
  const now = new Date()
  const extra = (prediction.match as any).tournament?.type === 'world_cup' ? 5 : 3
  const windowOpenMin = 45 + extra - 3
  const windowCloseMin = 45 + extra + 15
  const windowStart = new Date(kickoff.getTime() + windowOpenMin * 60 * 1000)
  const windowEnd = new Date(kickoff.getTime() + windowCloseMin * 60 * 1000)
  if (now < windowStart || now > windowEnd)
    return NextResponse.json({ error: `X2 זמין רק בחלון ההפסקה (דקה ${windowOpenMin}-${windowCloseMin})` }, { status: 400 })

  if (prediction.shinooApplied)
    return NextResponse.json({ error: 'לא ניתן להשתמש ב-X2 ובשינוי על אותו משחק' }, { status: 400 })

  if (prediction.x2Applied)
    return NextResponse.json({ error: 'X2 כבר הופעל על משחק זה' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { x2Stock: true } })
  if (!user || user.x2Stock < 1)
    return NextResponse.json({ error: 'אין לך X2 — קנה בחנות' }, { status: 400 })

  const matchday = getRoundNumber(prediction.match.round)

  await db.user.update({ where: { id: userId }, data: { x2Stock: { decrement: 1 } } })
  await db.prediction.update({ where: { id: predictionId }, data: { x2Applied: true } })
  await db.powerupUsage.create({ data: { id: `x2-${predictionId}`, userId, leagueId: prediction.leagueId, matchday, type: 'X2' } })

  const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { x2Stock: true, shinooStock: true } })
  return NextResponse.json({ success: true, x2Stock: updatedUser?.x2Stock, shinooStock: updatedUser?.shinooStock })
}
