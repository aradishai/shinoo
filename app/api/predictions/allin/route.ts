import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'

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

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'ALL IN זמין רק לפני נעילת המשחק' }, { status: 400 })

  if (prediction.allinApplied)
    return NextResponse.json({ error: 'ALL IN כבר הופעל על משחק זה' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { allinStock: true, username: true },
  })
  if (!user || user.allinStock < 1)
    return NextResponse.json({ error: 'אין לך ALL IN — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { allinStock: { decrement: 1 } } })
  await db.prediction.update({ where: { id: predictionId }, data: { allinApplied: true } })

  // Find or create pool for this match + league
  let pool = await db.allInPool.findUnique({
    where: { matchId_leagueId: { matchId: prediction.matchId, leagueId: prediction.leagueId } },
  })
  if (!pool) {
    pool = await db.allInPool.create({
      data: { matchId: prediction.matchId, leagueId: prediction.leagueId },
    })
  }

  await db.allInEntry.upsert({
    where: { predictionId },
    update: {},
    create: { poolId: pool.id, userId, predictionId },
  })

  await postSystemMessage(
    prediction.leagueId,
    userId,
    `${user.username} נכנס ALL IN על ${prediction.match.homeTeam.nameHe} נגד ${prediction.match.awayTeam.nameHe}`
  )

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true, allinStock: true },
  })
  return NextResponse.json({ success: true, ...updatedUser })
}
