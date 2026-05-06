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

    // Update this prediction and all matching predictions for the same match across all leagues
    const [updated] = await Promise.all([
      db.prediction.update({
        where: { id: params.id },
        data: predData,
        include: { points: true },
      }),
      db.prediction.updateMany({
        where: { userId, matchId: prediction.matchId, id: { not: params.id } },
        data: predData,
      }),
    ])

    return NextResponse.json({ data: updated, message: 'הניחוש עודכן!' })
  } catch (error) {
    console.error('Prediction PUT error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
