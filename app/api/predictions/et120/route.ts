import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'

const ET120_WINDOW_MINUTES = 75

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

  // Must be LIVE or PAUSED
  if (!['LIVE', 'PAUSED'].includes(prediction.match.status))
    return NextResponse.json({ error: '120 ET זמין רק במהלך המשחק' }, { status: 400 })

  // Must be within 137 minutes of kickoff
  const now = new Date()
  const kickoff = prediction.match.kickoffAt
  const windowEnd = new Date(kickoff.getTime() + ET120_WINDOW_MINUTES * 60 * 1000)
  if (now >= windowEnd)
    return NextResponse.json({ error: 'לא ניתן להפעיל 120 ET לאחר דקה 96' }, { status: 400 })

  // Cannot combine with other powerups
  const p = prediction as any
  const anyApplied = p.x2Applied || p.x3Applied || p.goalsApplied || p.splitApplied ||
    p.allinApplied || p.peekApplied || p.shinooApplied || p.minute90Applied || p.et120Applied

  if (anyApplied)
    return NextResponse.json({ error: 'לא ניתן לשלב 120 ET עם פאווראפ אחר' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { et120Stock: true, username: true } as any })
  if (!user || (user as any).et120Stock < 1)
    return NextResponse.json({ error: 'אין לך 120 ET — קנה בחנות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { et120Stock: { decrement: 1 } } as any })
  await db.prediction.updateMany({
    where: { userId, matchId: prediction.matchId },
    data: { et120Applied: true } as any,
  })

  await postSystemMessage(
    prediction.leagueId,
    userId,
    `${user.username} הפעיל 120 ET על ${prediction.match.homeTeam.nameHe} נגד ${prediction.match.awayTeam.nameHe}`
  )

  const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { et120Stock: true } as any })
  return NextResponse.json({ success: true, et120Stock: (updatedUser as any)?.et120Stock ?? 0 })
}
