import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const prediction = await db.prediction.findUnique({
      where: { id: params.id },
      include: { match: true },
    })

    if (!prediction) {
      return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })
    }

    if (prediction.userId !== userId) {
      return NextResponse.json({ error: 'אין הרשאה לערוך ניחוש זה' }, { status: 403 })
    }

    // Check if match is locked
    const match = prediction.match
    if (match.status === 'LOCKED' || match.status === 'LIVE' || match.status === 'FINISHED') {
      return NextResponse.json({ error: 'לא ניתן לערוך ניחוש לאחר נעילה' }, { status: 400 })
    }

    if (new Date() >= match.lockAt) {
      return NextResponse.json({ error: 'זמן הניחוש עבר' }, { status: 400 })
    }

    const body = await request.json()
    const { predictedHomeScore, predictedAwayScore, predictedTopScorerPlayerId } = body

    if (
      !Number.isInteger(predictedHomeScore) ||
      !Number.isInteger(predictedAwayScore) ||
      predictedHomeScore < 0 ||
      predictedAwayScore < 0
    ) {
      return NextResponse.json({ error: 'תוצאה לא תקינה' }, { status: 400 })
    }

    const predData = {
      predictedHomeScore,
      predictedAwayScore,
      predictedTopScorerPlayerId: predictedTopScorerPlayerId || null,
    }

    // Get all leagues the user belongs to
    const memberships = await db.leagueMember.findMany({
      where: { userId },
      select: { leagueId: true },
    })

    const otherLeagues = memberships
      .map(m => m.leagueId)
      .filter(lid => lid !== prediction.leagueId)

    // Update this prediction + upsert (create if missing) in all other leagues
    const [updated] = await Promise.all([
      db.prediction.update({
        where: { id: params.id },
        data: predData,
        include: { points: true },
      }),
      ...otherLeagues.map(lid =>
        db.prediction.upsert({
          where: { userId_leagueId_matchId: { userId, leagueId: lid, matchId: prediction.matchId } },
          update: predData,
          create: { userId, leagueId: lid, matchId: prediction.matchId, ...predData },
        })
      ),
    ])

    return NextResponse.json({ data: updated, message: 'הניחוש עודכן!' })
  } catch (error) {
    console.error('Prediction PUT error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
