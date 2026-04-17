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
    if (status) {
      whereClause.status = status
    }

    const matches = await db.match.findMany({
      where: whereClause,
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        tournament: true,
        scorers: {
          include: { player: true },
        },
      },
      orderBy: { kickoffAt: 'asc' },
    })

    // Attach user's prediction for each match (filter by leagueId if provided)
    const predWhere: Record<string, unknown> = {
      userId,
      matchId: { in: matches.map((m) => m.id) },
    }
    if (leagueId) predWhere.leagueId = leagueId

    const predictions = await db.prediction.findMany({
      where: predWhere,
      include: { points: true },
    })
    const predictionsMap = Object.fromEntries(predictions.map((p) => [p.matchId, p]))

    const result = matches.map((match) => ({
      ...match,
      userPrediction: predictionsMap[match.id] || null,
    }))

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Matches error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
