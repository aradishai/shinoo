import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        coins: true,
        x2Stock: true,
        shinooStock: true,
        x3Stock: true,
        goalsStock: true,
        minute90Stock: true,
        splitStock: true,
        allinStock: true,
        doubleStock: true,
        peekStock: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            leagueMembers: true,
            predictions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    // Determine lower-playoff status (rank >= 7 in הבאילנדוז)
    const BAILANDOZ_ID = 'cmo7p04ly000001oc97z3uwbs'
    const rankRows = await db.$queryRaw<{ userId: string; points: bigint }[]>`
      SELECT p."userId", COALESCE(SUM(pp."totalPoints"), 0) AS points
      FROM "Prediction" p
      LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
      WHERE p."leagueId" = ${BAILANDOZ_ID}
      GROUP BY p."userId"
      ORDER BY points DESC
    `
    const rank = rankRows.findIndex(r => r.userId === userId) + 1
    const lowerPlayoff = rank >= 7

    return NextResponse.json({ data: { ...user, isAdmin: user.username === 'ערד', lowerPlayoff } })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
