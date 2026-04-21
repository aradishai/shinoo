import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculatePoints } from '@/lib/scoring-engine'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { homeScore, awayScore, status } = await request.json()

    if (homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const match = await db.match.update({
      where: { id: params.id },
      data: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: status || 'FINISHED',
      },
    })

    // recalculate points for all predictions on this match
    const scorers = await db.matchScorer.findMany({
      where: { matchId: params.id },
      select: { playerId: true, goals: true },
    })
    const maxGoals = scorers.length > 0 ? Math.max(...scorers.map(s => s.goals)) : 0
    const topScorerIds = scorers.filter(s => s.goals === maxGoals).map(s => s.playerId)

    const predictions = await db.prediction.findMany({
      where: { matchId: params.id },
    })

    for (const pred of predictions) {
      const result = calculatePoints(
        pred.predictedHomeScore,
        pred.predictedAwayScore,
        match.homeScore!,
        match.awayScore!,
      )

      await db.predictionPoints.upsert({
        where: { predictionId: pred.id },
        update: {
          resultPoints: result.resultPoints,
          topScorerPoints: result.topScorerPoints,
          totalPoints: result.totalPoints,
          explanation: result.explanation,
        },
        create: {
          predictionId: pred.id,
          resultPoints: result.resultPoints,
          topScorerPoints: result.topScorerPoints,
          totalPoints: result.totalPoints,
          explanation: result.explanation,
        },
      })
    }

    return NextResponse.json({ message: 'תוצאה עודכנה ונקודות חושבו מחדש', data: match })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
