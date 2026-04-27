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
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean)
      whereClause.status = statuses.length === 1 ? statuses[0] : { in: statuses }
    }

    const matches = await db.match.findMany({
      where: whereClause,
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        tournament: true,
        scorers: { include: { player: true } },
      },
      orderBy: { kickoffAt: status === 'FINISHED' ? 'desc' : 'asc' },
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

    // Member predictions for FINISHED/LIVE/PAUSED/LOCKED matches
    const visibleStatuses = ['FINISHED', 'LIVE', 'PAUSED', 'LOCKED']
    const visibleMatchIds = matches.filter(m => visibleStatuses.includes(m.status)).map(m => m.id)

    let memberPredMap: Record<string, any[]> = {}
    if (visibleMatchIds.length > 0) {
      // Always filter by leagues the current user belongs to
      const userLeagueMemberships = await db.leagueMember.findMany({
        where: { userId },
        select: { leagueId: true },
      })
      const userLeagueIds = userLeagueMemberships.map((m) => m.leagueId)

      const memberPredWhere: Record<string, unknown> = {
        matchId: { in: visibleMatchIds },
        userId: { not: userId },
        leagueId: leagueId ? leagueId : { in: userLeagueIds },
      }

      const memberPreds = await db.prediction.findMany({
        where: memberPredWhere,
        include: { user: { select: { id: true, username: true } }, points: true },
      })

      for (const p of memberPreds) {
        if (!memberPredMap[p.matchId]) memberPredMap[p.matchId] = []
        memberPredMap[p.matchId].push(p)
      }
    }

    // Powerup usage for LIVE/PAUSED matches
    const pausedMatches = matches.filter(m => ['LIVE', 'PAUSED'].includes(m.status))
    const powerupMap: Record<string, { x2Used: number; shinooUsed: number }> = {}
    for (const pm of pausedMatches) {
      const pred = predictionsMap[pm.id]
      const matchday = parseInt(pm.round?.replace(/\D/g, '') || '0')
      if (pred && matchday > 0) {
        const [x2Used, shinooUsed] = await Promise.all([
          db.powerupUsage.count({ where: { userId, leagueId: pred.leagueId, matchday, type: 'X2' } }),
          db.powerupUsage.count({ where: { userId, leagueId: pred.leagueId, matchday, type: 'SHINOO' } }),
        ])
        powerupMap[pm.id] = { x2Used, shinooUsed }
      }
    }

    const result = matches.map((match) => ({
      ...match,
      userPrediction: predictionsMap[match.id] || null,
      memberPredictions: memberPredMap[match.id] || [],
      powerupUsage: powerupMap[match.id] || null,
    }))

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Matches error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
