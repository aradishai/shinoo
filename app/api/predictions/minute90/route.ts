import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'
import { hasNonMinute90PowerupApplied } from '@/lib/double-guard'

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

  const { matchId, leagueId } = await request.json()
  if (!matchId || !leagueId) return NextResponse.json({ error: 'חסר matchId או leagueId' }, { status: 400 })

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: { tournament: true, homeTeam: true, awayTeam: true },
  })
  if (!match) return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })

  if (!['LOCKED', 'LIVE', 'PAUSED'].includes(match.status))
    return NextResponse.json({ error: 'דקה 90 זמין רק כשהמשחק ננעל או במהלכו' }, { status: 400 })

  const existingPrediction = await db.prediction.findFirst({
    where: { userId, matchId, leagueId },
  })

  if (existingPrediction && hasNonMinute90PowerupApplied(existingPrediction))
    return NextResponse.json({ error: 'ניתן להפעיל לחצן אחד בלבד על כל משחק' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { minute90Stock: true, username: true } })
  if (!user || user.minute90Stock < 1)
    return NextResponse.json({ error: 'אין לך דקה 90 — קנה בחנות' }, { status: 400 })

  let newHome: number
  let newAway: number
  do {
    newHome = Math.floor(Math.random() * 6)
    newAway = Math.floor(Math.random() * 6)
  } while (
    existingPrediction &&
    newHome === existingPrediction.predictedHomeScore &&
    newAway === existingPrediction.predictedAwayScore
  )

  const matchday = getRoundNumber(match.round)

  await db.user.update({ where: { id: userId }, data: { minute90Stock: { decrement: 1 } } })

  if (existingPrediction) {
    await db.prediction.updateMany({
      where: { userId, matchId },
      data: { predictedHomeScore: newHome, predictedAwayScore: newAway, minute90Applied: true } as any,
    })
  } else {
    await db.prediction.create({
      data: { userId, leagueId, matchId, predictedHomeScore: newHome, predictedAwayScore: newAway, minute90Applied: true } as any,
    })
  }

  if (matchday > 0) {
    await (db as any).powerupUsage.create({
      data: { userId, leagueId, matchday, type: 'MINUTE90' },
    })
  }

  await postSystemMessage(
    leagueId,
    userId,
    `${user.username} הפעיל דקה 90' על ${match.homeTeam.nameHe} נגד ${match.awayTeam.nameHe}`
  )

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, newHome, newAway, ...updatedUser })
}
