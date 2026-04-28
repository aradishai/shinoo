import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getRoundNumber(round: string | null | undefined): number {
  if (!round) return 0
  const digits = round.replace(/\D/g, '')
  if (digits) return parseInt(digits)
  if (round.includes('גמר')) return 100
  return 0
}

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
                  include: { points: true, match: { select: { status: true } } },
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
        const scored = predictions.filter(p => p.points !== null)
        const finished = scored.filter(p => p.match?.status === 'FINISHED')
        const wrong = finished.filter(p => (p.points?.resultPoints || 0) === 0).length
        const outcomeOnly = scored.filter(p => (p.points?.resultPoints || 0) === 1).length
        const outcomeAndOne = scored.filter(p => (p.points?.resultPoints || 0) === 3).length
        const exactScores = scored.filter(p => (p.points?.resultPoints || 0) === 5).length

        return {
          userId: member.userId,
          username: member.user.username,
          role: member.role,
          totalPoints,
          predictionCount: scored.length,
          wrong,
          outcomeOnly,
          outcomeAndOne,
          exactScores,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    // Get live + upcoming matches (LIVE/PAUSED can have kickoffAt in the past)
    const now = new Date()
    const matches = await db.match.findMany({
      where: {
        OR: [
          { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
          { status: 'SCHEDULED', kickoffAt: { gte: now } },
          { status: 'SCHEDULED', lockAt: { gte: now } },
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { kickoffAt: 'asc' },
      take: 10,
    })

    const matchIds = matches.map((m) => m.id)
    const lockedStatuses = ['LOCKED', 'LIVE', 'PAUSED', 'FINISHED']

    // User predictions
    const userPredictions = await db.prediction.findMany({
      where: { userId, leagueId: params.id, matchId: { in: matchIds } },
    })
    const predMap = Object.fromEntries(userPredictions.map((p) => [p.matchId, p]))

    // Member predictions (visible only after match locks)
    const lockedMatchIds = matches.filter(m => lockedStatuses.includes(m.status)).map(m => m.id)
    const memberPredictions = lockedMatchIds.length > 0
      ? await db.prediction.findMany({
          where: { leagueId: params.id, matchId: { in: lockedMatchIds }, userId: { not: userId } },
          include: { user: { select: { id: true, username: true } } },
        })
      : []
    const memberPredMap: Record<string, any[]> = {}
    for (const p of memberPredictions) {
      if (!memberPredMap[p.matchId]) memberPredMap[p.matchId] = []
      memberPredMap[p.matchId].push(p)
    }

    // Powerup usage for LIVE/PAUSED matches
    const liveMatchIds = matches.filter(m => ['LIVE', 'PAUSED'].includes(m.status)).map(m => m.id)
    const powerupMap: Record<string, { x2Used: number; shinooUsed: number }> = {}
    for (const matchId of liveMatchIds) {
      const pred = predMap[matchId]
      const match = matches.find(m => m.id === matchId)
      const matchday = getRoundNumber(match?.round)
      if (pred && matchday > 0) {
        const [x2Used, shinooUsed] = await Promise.all([
          db.powerupUsage.count({ where: { userId, leagueId: params.id, matchday, type: 'X2' } }),
          db.powerupUsage.count({ where: { userId, leagueId: params.id, matchday, type: 'SHINOO' } }),
        ])
        powerupMap[matchId] = { x2Used, shinooUsed }
      }
    }

    const matchesWithPredictions = matches.map((match) => ({
      ...match,
      userPrediction: predMap[match.id] || null,
      memberPredictions: memberPredMap[match.id] || [],
      powerupUsage: powerupMap[match.id] || null,
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'שם ליגה נדרש' }, { status: 400 })

  const membership = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!membership || membership.role !== 'ADMIN')
    return NextResponse.json({ error: 'רק מנהל יכול לשנות את שם הליגה' }, { status: 403 })

  const updated = await db.league.update({
    where: { id: params.id },
    data: { name: name.trim() },
  })

  return NextResponse.json({ ok: true, name: updated.name })
}
