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

    // Get user's own predictions across all leagues
    const predictions = await db.prediction.findMany({
      where: { userId, matchId: params.id },
      include: { league: true, points: true, predictedTopScorer: true },
    })

    // When match is locked, fetch all league members' predictions
    let memberPredictions: any[] = []
    const isLocked = ['LOCKED', 'LIVE', 'FINISHED'].includes(match.status)

    if (isLocked) {
      // Find leagues the current user belongs to
      const userLeagues = await db.leagueMember.findMany({
        where: { userId },
        select: { leagueId: true },
      })
      const leagueIds = userLeagues.map((m) => m.leagueId)

      memberPredictions = await db.prediction.findMany({
        where: {
          matchId: params.id,
          leagueId: { in: leagueIds },
          userId: { not: userId },
        },
        include: {
          user: { select: { id: true, username: true } },
          points: true,
        },
      })

      // Sort by league standings (first league the user is in)
      if (leagueIds.length > 0) {
        const standingsRows = await db.$queryRaw<{ userId: string }[]>`
          SELECT p."userId"
          FROM "Prediction" p
          LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
          WHERE p."leagueId" = ${leagueIds[0]}
          GROUP BY p."userId"
          ORDER BY COALESCE(SUM(pp."totalPoints"), 0) DESC
        `
        const rankMap: Record<string, number> = {}
        standingsRows.forEach((r, i) => { rankMap[r.userId] = i + 1 })
        memberPredictions.sort((a, b) => (rankMap[a.userId] ?? 999) - (rankMap[b.userId] ?? 999))
      }
    }

    return NextResponse.json({ data: { match, predictions, memberPredictions } })
  } catch (error) {
    console.error('Match detail error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
