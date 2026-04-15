import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const match = await db.match.findUnique({
      where: { id: params.id },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        tournament: true,
        scorers: { include: { player: true } },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'משחק לא נמצא' }, { status: 404 })
    }

    // Get user's predictions for this match across all leagues
    const predictions = await db.prediction.findMany({
      where: { userId, matchId: params.id },
      include: {
        league: true,
        points: true,
        predictedTopScorer: true,
      },
    })

    return NextResponse.json({ data: { match, predictions } })
  } catch (error) {
    console.error('Match detail error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
