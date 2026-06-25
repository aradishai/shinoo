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

  const { searchParams } = new URL(request.url)
  const selectedRound = searchParams.get('round')

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
                  include: { points: true, match: { select: { status: true, round: true } } },
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

    // Collect available rounds
    const roundSet = new Set<string>()
    for (const member of league.members)
      for (const p of member.user.predictions)
        if (p.match?.round) roundSet.add(p.match.round)
    const rounds = Array.from(roundSet).sort((a, b) => getRoundNumber(a) - getRoundNumber(b))

    // Fetch double bonus per user for this league
    const resolvedDoubles = await (db as any).doubleEntry.findMany({
      where: { leagueId: params.id, resolved: true },
      select: { userId: true, bonusPoints: true },
    }) as { userId: string; bonusPoints: number | null }[]
    const doubleBonusMap: Record<string, number> = {}
    for (const d of resolvedDoubles) {
      doubleBonusMap[d.userId] = (doubleBonusMap[d.userId] ?? 0) + (d.bonusPoints ?? 0)
    }

    // Build standings
    const standings = league.members
      .map((member) => {
        const predictions = selectedRound
          ? member.user.predictions.filter(p => p.match?.round === selectedRound)
          : member.user.predictions
        const baseTotal = predictions.reduce(
          (sum, pred) => sum + (pred.points?.totalPoints || 0),
          0
        )
        const doubleBonus = doubleBonusMap[member.userId] ?? 0
        const totalPoints = baseTotal + doubleBonus
        const scored = predictions.filter(p => p.points !== null)
        const finished = scored.filter(p => p.match?.status === 'FINISHED')
        const wrong = finished.filter(p => (p.points?.resultPoints || 0) === 0).length
        const outcomeOnly = scored.filter(p => (p.points?.resultPoints || 0) === 1).length
        const drawInexact = scored.filter(p => (p.points?.resultPoints || 0) === 2).length
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
          drawInexact,
          outcomeAndOne,
          exactScores,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    // Get live + upcoming matches (LIVE/PAUSED can have kickoffAt in the past)
    const now = new Date()

    // Also include matches the user has already predicted (even if beyond the display window)
    const userPredictedMatchIds = await db.prediction.findMany({
      where: { userId, leagueId: params.id },
      select: { matchId: true },
    }).then(ps => ps.map(p => p.matchId))

    const matches = await db.match.findMany({
      where: {
        OR: [
          { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
          { status: 'SCHEDULED', kickoffAt: { gte: now } },
          { status: 'SCHEDULED', lockAt: { gte: now } },
          ...(userPredictedMatchIds.length > 0 ? [{ id: { in: userPredictedMatchIds }, status: { not: 'FINISHED' } }] : []),
        ],
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        tournament: { select: { type: true } },
      },
      orderBy: { kickoffAt: 'asc' },
      take: 15,
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
    const rankMap: Record<string, number> = {}
    for (const s of standings) rankMap[s.userId] = s.rank

    const memberPredMap: Record<string, any[]> = {}
    for (const p of memberPredictions) {
      if (!memberPredMap[p.matchId]) memberPredMap[p.matchId] = []
      memberPredMap[p.matchId].push(p)
    }
    for (const matchId of Object.keys(memberPredMap)) {
      memberPredMap[matchId].sort((a, b) => (rankMap[a.userId] ?? 999) - (rankMap[b.userId] ?? 999))
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

    const activeDoubleEntry = await (db as any).doubleEntry.findFirst({
      where: { userId, leagueId: params.id, resolved: false },
      select: { id: true, predictionId1: true, predictionId2: true },
      orderBy: { createdAt: 'desc' },
    }) as { id: string; predictionId1: string | null; predictionId2: string | null } | null

    return NextResponse.json({
      data: {
        id: league.id,
        name: league.name,
        inviteCode: league.inviteCode,
        createdAt: league.createdAt,
        createdBy: league.createdBy,
        standings,
        rounds,
        matches: matchesWithPredictions,
        activeDoubleEntry,
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const membership = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!membership || membership.role !== 'ADMIN')
    return NextResponse.json({ error: 'רק מנהל הליגה יכול למחוק אותה' }, { status: 403 })

  const predIds = await db.prediction.findMany({
    where: { leagueId: params.id },
    select: { id: true },
  }).then(ps => ps.map(p => p.id))

  if (predIds.length > 0) {
    await db.coinBet.deleteMany({ where: { predictionId: { in: predIds } } })
    await db.predictionPoints.deleteMany({ where: { predictionId: { in: predIds } } })
  }
  await db.prediction.deleteMany({ where: { leagueId: params.id } })
  await db.powerupUsage.deleteMany({ where: { leagueId: params.id } })
  await db.leagueMember.deleteMany({ where: { leagueId: params.id } })
  await db.league.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
