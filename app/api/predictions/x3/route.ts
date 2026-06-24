import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'
import { isInDoubleEntry } from '@/lib/double-guard'

const BAILANDOZ_ID = 'cmo7p04ly000001oc97z3uwbs'

async function getUserLeagueRank(userId: string, leagueId: string): Promise<number> {
  const rows = await db.$queryRaw<{ userId: string }[]>`
    SELECT p."userId"
    FROM "Prediction" p
    LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
    WHERE p."leagueId" = ${leagueId}
    GROUP BY p."userId"
    ORDER BY COALESCE(SUM(pp."totalPoints"), 0) DESC
  `
  const rank = rows.findIndex(r => r.userId === userId) + 1
  return rank || 999
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId } = await request.json()
  if (!predictionId) return NextResponse.json({ error: 'חסר predictionId' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  // X3 only for lower playoff (rank >= 7) in הבאילנדוז
  if (prediction.leagueId === BAILANDOZ_ID) {
    const rank = await getUserLeagueRank(userId, BAILANDOZ_ID)
    if (rank < 7) return NextResponse.json({ error: 'X3 זמין רק לשחקני הפליאוף התחתון (מקום 7 ומטה)' }, { status: 403 })
  }

  if (await isInDoubleEntry(predictionId))
    return NextResponse.json({ error: 'לא ניתן לשלב לחצן עם DOUBLE' }, { status: 400 })

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'X3 זמין רק לפני נעילת המשחק' }, { status: 400 })

  if ((prediction as any).x3Applied)
    return NextResponse.json({ error: 'X3 כבר הופעל על משחק זה' }, { status: 400 })

  if (prediction.x2Applied)
    return NextResponse.json({ error: 'לא ניתן לשלב X2 ו-X3' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { x3Stock: true, username: true } })
  if (!user || user.x3Stock < 1)
    return NextResponse.json({ error: 'אין לך X3 — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { x3Stock: { decrement: 1 } } })
  await db.prediction.updateMany({ where: { userId, matchId: prediction.matchId }, data: { x3Applied: true } as any })

  await postSystemMessage(
    prediction.leagueId,
    userId,
    `${user.username} הפעיל X3 על ${prediction.match.homeTeam.nameHe} נגד ${prediction.match.awayTeam.nameHe}`
  )

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  return NextResponse.json({ success: true, ...updatedUser })
}
