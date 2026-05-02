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
    return NextResponse.json({ error: 'דקה 90 זמין רק במהלך משחק' }, { status: 400 })

  const kickoff = prediction.match.kickoffAt
  const now = new Date()
  const elapsedMin = (now.getTime() - kickoff.getTime()) / 60000
  if (elapsedMin >= 95)
    return NextResponse.json({ error: 'דקה 90 זמין רק עד דקה 90' }, { status: 400 })

  // TESTING MODE — no restrictions
  const newHome = Math.floor(Math.random() * 5)
  const newAway = Math.floor(Math.random() * 5)
  const matchday = getRoundNumber(prediction.match.round)

  await db.prediction.update({
    where: { id: predictionId },
    data: { predictedHomeScore: newHome, predictedAwayScore: newAway, minute90Applied: true } as any,
  })
  if (matchday > 0) {
    await db.powerupUsage.create({
      data: { id: `90-${predictionId}`, userId, leagueId: prediction.leagueId, matchday, type: 'MINUTE90' },
    })
  }

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, newHome, newAway, ...updatedUser })
}
