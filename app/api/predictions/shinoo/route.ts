import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const COIN_COST = 2

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

  const { predictionId, team, delta } = await request.json()
  if (!predictionId || !team || !delta)
    return NextResponse.json({ error: 'חסרים פרמטרים' }, { status: 400 })

  if (!['home', 'away'].includes(team) || ![-1, 1].includes(delta))
    return NextResponse.json({ error: 'פרמטרים לא תקינים' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: { include: { tournament: true } } },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (!['LIVE', 'PAUSED'].includes(prediction.match.status))
    return NextResponse.json({ error: 'שינוי זמין רק במהלך משחק' }, { status: 400 })

  const kickoff = prediction.match.kickoffAt
  const now = new Date()
  const extra = prediction.match.tournament?.type === 'world_cup' ? 5 : 3
  const windowOpenMin = 45 + extra - 3
  const windowCloseMin = 45 + extra + 15
  const windowStart = new Date(kickoff.getTime() + windowOpenMin * 60 * 1000)
  const windowEnd = new Date(kickoff.getTime() + windowCloseMin * 60 * 1000)
  if (now < windowStart || now > windowEnd)
    return NextResponse.json({ error: `שינוי זמין רק בחלון ההפסקה (דקה ${windowOpenMin}-${windowCloseMin})` }, { status: 400 })

  if (prediction.x2Applied)
    return NextResponse.json({ error: 'לא ניתן להשתמש ב-X2 ובשינוי על אותו משחק' }, { status: 400 })

  if (prediction.shinooApplied)
    return NextResponse.json({ error: 'שינוי כבר הופעל על משחק זה' }, { status: 400 })

  const newHome = prediction.predictedHomeScore + (team === 'home' ? delta : 0)
  const newAway = prediction.predictedAwayScore + (team === 'away' ? delta : 0)

  if (newHome < 0 || newAway < 0)
    return NextResponse.json({ error: 'לא ניתן להוריד מתחת ל-0' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })
  if (!user || user.coins < COIN_COST)
    return NextResponse.json({ error: `חסרים מטבעות — שינוי עולה 🪙${COIN_COST}` }, { status: 400 })

  const matchday = getRoundNumber(prediction.match.round)

  await db.user.update({ where: { id: userId }, data: { coins: { decrement: COIN_COST } } })
  await db.prediction.update({
    where: { id: predictionId },
    data: { predictedHomeScore: newHome, predictedAwayScore: newAway, shinooApplied: true },
  })
  await db.powerupUsage.create({ data: { id: `shinoo-${predictionId}`, userId, leagueId: prediction.leagueId, matchday, type: 'SHINOO' } })

  const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })
  return NextResponse.json({ success: true, newHome, newAway, coins: updatedUser?.coins })
}
