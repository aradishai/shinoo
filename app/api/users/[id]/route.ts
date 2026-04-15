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
    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        createdAt: true,
        predictions: {
          include: { points: true },
        },
        leagueMembers: {
          include: {
            league: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    const totalPoints = user.predictions.reduce(
      (sum, pred) => sum + (pred.points?.totalPoints || 0),
      0
    )
    const correctPredictions = user.predictions.filter(
      (pred) => (pred.points?.resultPoints || 0) > 0
    ).length
    const exactScores = user.predictions.filter(
      (pred) => (pred.points?.resultPoints || 0) === 5
    ).length

    return NextResponse.json({
      data: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        stats: {
          totalPoints,
          correctPredictions,
          exactScores,
          totalPredictions: user.predictions.length,
          leagues: user.leagueMembers.length,
        },
        leagues: user.leagueMembers.map((lm) => ({
          id: lm.league.id,
          name: lm.league.name,
          role: lm.role,
        })),
      },
    })
  } catch (error) {
    console.error('User detail error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
