import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const leagueId = searchParams.get('leagueId')
    const matchId = searchParams.get('matchId')

    const whereClause: Record<string, unknown> = { userId }
    if (leagueId) whereClause.leagueId = leagueId
    if (matchId) whereClause.matchId = matchId

    const predictions = await db.prediction.findMany({
      where: whereClause,
      include: {
        match: {
          include: { homeTeam: true, awayTeam: true },
        },
        league: true,
        points: true,
        predictedTopScorer: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: predictions })
  } catch (error) {
    console.error('Predictions GET error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { matchId, leagueId, predictedHomeScore, predictedAwayScore, predictedTopScorerPlayerId, coinBet } = body

    if (!matchId || !leagueId) {
      return NextResponse.json({ error: 'matchId ו-leagueId נדרשים' }, { status: 400 })
    }

    if (predictedHomeScore === undefined || predictedAwayScore === undefined) {
      return NextResponse.json({ error: 'תוצאה מנוחשת נדרשת' }, { status: 400 })
    }

    if (
      !Number.isInteger(predictedHomeScore) ||
      !Number.isInteger(predictedAwayScore) ||
      predictedHomeScore < 0 ||
      predictedAwayScore < 0 ||
      predictedHomeScore > 20 ||
      predictedAwayScore > 20
    ) {
      return NextResponse.json({ error: 'תוצאה לא תקינה' }, { status: 400 })
    }

    // Check match exists and is not locked
    const match = await db.match.findUnique({ where: { id: matchId } })
    if (!match) {
      return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
    }

    if (match.status === 'LOCKED' || match.status === 'LIVE' || match.status === 'FINISHED') {
      return NextResponse.json({ error: 'זמן הניחוש נעל' }, { status: 400 })
    }

    if (new Date() >= match.lockAt) {
      return NextResponse.json({ error: 'זמן הניחוש עבר' }, { status: 400 })
    }

    // Check user is member of league
    const membership = await db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'אינך חבר בליגה זו' }, { status: 403 })
    }

    // Validate coin bet
    const betAmount = typeof coinBet === 'number' && coinBet > 0 ? Math.floor(coinBet) : 0
    if (betAmount > 0) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })
      if (!user || user.coins < betAmount)
        return NextResponse.json({ error: 'אין מספיק מטבעות' }, { status: 400 })
    }

    // Upsert prediction
    const prediction = await db.prediction.upsert({
      where: { userId_leagueId_matchId: { userId, leagueId, matchId } },
      update: {
        predictedHomeScore,
        predictedAwayScore,
        predictedTopScorerPlayerId: predictedTopScorerPlayerId || null,
      },
      create: {
        userId,
        leagueId,
        matchId,
        predictedHomeScore,
        predictedAwayScore,
        predictedTopScorerPlayerId: predictedTopScorerPlayerId || null,
      },
      include: { points: true, coinBet: true },
    })

    // Handle coin bet (only on new bets or when no bet exists yet)
    if (betAmount > 0 && !prediction.coinBet) {
      await db.user.update({ where: { id: userId }, data: { coins: { decrement: betAmount } } })
      await db.coinBet.create({ data: { userId, predictionId: prediction.id, betAmount } })
    }

    const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })

    return NextResponse.json(
      { data: prediction, message: 'הניחוש נשמר!', coins: updatedUser?.coins },
      { status: 200 }
    )
  } catch (error) {
    console.error('Predictions POST error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
