import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { nanoid } from 'nanoid'

async function copyOpenPredictionsToLeague(userId: string, leagueId: string) {
  const openPredictions = await db.prediction.findMany({
    where: {
      userId,
      leagueId: { not: leagueId },
      match: { status: { notIn: ['FINISHED', 'CANCELLED', 'POSTPONED'] } },
    },
    distinct: ['matchId'],
    orderBy: { createdAt: 'asc' },
  })
  for (const pred of openPredictions) {
    await db.prediction.upsert({
      where: { userId_leagueId_matchId: { userId, leagueId, matchId: pred.matchId } },
      update: {},
      create: {
        userId,
        leagueId,
        matchId: pred.matchId,
        predictedHomeScore: pred.predictedHomeScore,
        predictedAwayScore: pred.predictedAwayScore,
      },
    }).catch(() => {})
  }
}

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const memberships = await db.leagueMember.findMany({
      where: { userId },
      include: {
        league: {
          include: {
            _count: { select: { members: true } },
            members: {
              include: {
                user: {
                  include: {
                    predictions: {
                      include: { points: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    const leagues = memberships.map((membership) => {
      const league = membership.league

      // Calculate standings for rank
      const standings = league.members
        .map((member) => {
          const totalPoints = member.user.predictions.reduce(
            (sum, pred) => sum + (pred.points?.totalPoints || 0),
            0
          )
          return { userId: member.userId, totalPoints }
        })
        .sort((a, b) => b.totalPoints - a.totalPoints)

      const userStanding = standings.find((s) => s.userId === userId)
      const userRank = standings.findIndex((s) => s.userId === userId) + 1

      return {
        id: league.id,
        name: league.name,
        inviteCode: league.inviteCode,
        createdAt: league.createdAt,
        createdByUserId: league.createdByUserId,
        memberCount: league._count.members,
        userRank,
        userPoints: userStanding?.totalPoints || 0,
        role: membership.role,
      }
    })

    return NextResponse.json({ data: leagues })
  } catch (error) {
    console.error('Leagues GET error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, memberUsernames } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'שם הליגה חייב להיות לפחות 2 תווים' },
        { status: 400 }
      )
    }

    const inviteCode = nanoid(8)

    // Get active tournament
    const tournament = await db.tournament.findFirst({
      where: { isActive: true },
      orderBy: { id: 'desc' },
    })

    const league = await db.league.create({
      data: {
        name: name.trim(),
        createdByUserId: userId,
        inviteCode,
        tournamentId: tournament?.id,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
    })

    // Add initial members if provided
    if (memberUsernames && Array.isArray(memberUsernames)) {
      for (const username of memberUsernames) {
        const user = await db.user.findUnique({ where: { username } })
        if (user && user.id !== userId) {
          await db.leagueMember.create({
            data: { leagueId: league.id, userId: user.id, role: 'MEMBER' },
          }).catch(() => {}) // ignore if already member
        }
      }
    }

    await copyOpenPredictionsToLeague(userId, league.id)

    return NextResponse.json(
      { data: league, message: 'הליגה נוצרה בהצלחה!' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Leagues POST error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
