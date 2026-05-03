import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  try {
    // Find all World Cup tournaments
    const tournaments = await db.tournament.findMany({
      where: { isActive: true, type: 'world_cup' },
      select: { id: true, nameHe: true },
    })

    if (tournaments.length === 0) {
      return NextResponse.json({ data: { standings: [], tournamentName: null } })
    }

    const tournamentIds = tournaments.map((t) => t.id)
    const tournamentName = tournaments[0].nameHe

    // Get all finished matches in World Cup tournaments
    const finishedMatchIds = await db.match.findMany({
      where: { tournamentId: { in: tournamentIds }, status: 'FINISHED' },
      select: { id: true },
    })
    const matchIdSet = finishedMatchIds.map((m) => m.id)

    if (matchIdSet.length === 0) {
      return NextResponse.json({ data: { standings: [], tournamentName } })
    }

    // Sum points per user across all world cup predictions
    const pointsAgg = await db.predictionPoints.findMany({
      where: {
        prediction: {
          matchId: { in: matchIdSet },
        },
      },
      select: {
        totalPoints: true,
        resultPoints: true,
        prediction: {
          select: {
            userId: true,
            points: { select: { resultPoints: true } },
          },
        },
      },
    })

    // Aggregate per user
    const userMap: Record<string, { totalPoints: number; exactScores: number; predictions: number }> = {}
    for (const entry of pointsAgg) {
      const uid = entry.prediction.userId
      if (!userMap[uid]) userMap[uid] = { totalPoints: 0, exactScores: 0, predictions: 0 }
      userMap[uid].totalPoints += entry.totalPoints
      userMap[uid].predictions += 1
      if (entry.resultPoints === 5) userMap[uid].exactScores += 1
    }

    if (Object.keys(userMap).length === 0) {
      return NextResponse.json({ data: { standings: [], tournamentName } })
    }

    // Fetch usernames for all relevant users
    const userIds = Object.keys(userMap)
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    })
    const usernameMap = Object.fromEntries(users.map((u) => [u.id, u.username]))

    // Build sorted standings
    const standings = Object.entries(userMap)
      .map(([uid, stats]) => ({
        userId: uid,
        username: usernameMap[uid] || '?',
        totalPoints: stats.totalPoints,
        exactScores: stats.exactScores,
        predictionCount: stats.predictions,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.exactScores - a.exactScores)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    return NextResponse.json({ data: { standings, tournamentName } })
  } catch (error) {
    console.error('Global standings error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
