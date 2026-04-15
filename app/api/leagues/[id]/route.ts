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
    const league = await db.league.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, username: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                predictions: {
                  where: { leagueId: params.id },
                  include: { points: true },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!league) {
      return NextResponse.json({ error: 'ליגה לא נמצאה' }, { status: 404 })
    }

    // Check if user is a member
    const isMember = league.members.some((m) => m.userId === userId)
    if (!isMember) {
      return NextResponse.json({ error: 'אינך חבר בליגה זו' }, { status: 403 })
    }

    // Build standings
    const standings = league.members
      .map((member) => {
        const predictions = member.user.predictions
        const totalPoints = predictions.reduce(
          (sum, pred) => sum + (pred.points?.totalPoints || 0),
          0
        )
        const correctPredictions = predictions.filter(
          (pred) => (pred.points?.resultPoints || 0) > 0
        ).length
        const exactScores = predictions.filter(
          (pred) => (pred.points?.resultPoints || 0) === 5
        ).length

        return {
          userId: member.userId,
          username: member.user.username,
          role: member.role,
          totalPoints,
          correctPredictions,
          exactScores,
          predictionCount: predictions.length,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    // Get upcoming matches
    const matches = await db.match.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LOCKED', 'LIVE'] },
        kickoffAt: { gte: new Date() },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { kickoffAt: 'asc' },
      take: 10,
    })

    // Attach user predictions to matches
    const userPredictions = await db.prediction.findMany({
      where: {
        userId,
        leagueId: params.id,
        matchId: { in: matches.map((m) => m.id) },
      },
    })
    const predMap = Object.fromEntries(userPredictions.map((p) => [p.matchId, p]))

    const matchesWithPredictions = matches.map((match) => ({
      ...match,
      userPrediction: predMap[match.id] || null,
    }))

    return NextResponse.json({
      data: {
        id: league.id,
        name: league.name,
        inviteCode: league.inviteCode,
        createdAt: league.createdAt,
        createdBy: league.createdBy,
        standings,
        matches: matchesWithPredictions,
      },
    })
  } catch (error) {
    console.error('League detail error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
