import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const leagueId = searchParams.get('leagueId')

    const whereClause: Record<string, unknown> = {}
    if (status) whereClause.status = status

    const matches = await db.match.findMany({
      where: whereClause,
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        tournament: true,
        scorers: { include: { player: true } },
      },
      orderBy: { kickoffAt: 'asc' },
    })

    const matchIds = matches.map((m) => m.id)

    // User's predictions
    const predWhere: Record<string, unknown> = { userId, matchId: { in: matchIds } }
    if (leagueId) predWhere.leagueId = leagueId

    const predictions = await db.prediction.findMany({
      where: predWhere,
      include: { points: true },
    })
    const predictionsMap = Object.fromEntries(predictions.map((p) => [p.matchId, p]))

    // Member predictions for FINISHED/LIVE/LOCKED matches
    const visibleStatuses = ['FINISHED', 'LIVE', 'LOCKED']
    const visibleMatchIds = matches.filter(m => visibleStatuses.includes(m.status)).map(m => m.id)

    let memberPredMap: Record<string, any[]> = {}
    if (visibleMatchIds.length > 0) {
      const memberPredWhere: Record<string, unknown> = {
        matchId: { in: visibleMatchIds },
        userId: { not: userId },
      }
      if (leagueId) memberPredWhere.leagueId = leagueId

      const memberPreds = await db.prediction.findMany({
        where: memberPredWhere,
        include: { user: { select: { id: true, username: true } }, points: true },
      })

      for (const p of memberPreds) {
        if (!memberPredMap[p.matchId]) memberPredMap[p.matchId] = []
        memberPredMap[p.matchId].push(p)
      }
    }

    const result = matches.map((match) => ({
      ...match,
      userPrediction: predictionsMap[match.id] || null,
      memberPredictions: memberPredMap[match.id] || [],
    }))

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Matches error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
