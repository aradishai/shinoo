import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { matchId, team } = await request.json()
  if (!matchId || !['HOME', 'AWAY'].includes(team))
    return NextResponse.json({ error: 'נתונים שגויים' }, { status: 400 })

  const match = await db.match.findUnique({ where: { id: matchId }, select: { status: true, penaltyBetExpiresAt: true } as any })
  if (!match || !['LIVE', 'PAUSED', 'PENALTY'].includes(match.status))
    return NextResponse.json({ error: 'ניתן להמר רק בזמן הארכה לפני פנדלים' }, { status: 400 })
  const expiresAt: Date | null = (match as any).penaltyBetExpiresAt ?? null
  if (!expiresAt || new Date() > expiresAt)
    return NextResponse.json({ error: 'חלון ההימור טרם נפתח או נסגר' }, { status: 400 })

  const existing = await (db as any).penaltyBet.findUnique({
    where: { userId_matchId: { userId, matchId } },
  })
  if (existing) return NextResponse.json({ error: 'כבר הימרת על משחק זה' }, { status: 400 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })
  if (!user || user.coins < 1)
    return NextResponse.json({ error: 'אין מספיק מטבעות' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { coins: { decrement: 1 } } })
  await (db as any).penaltyBet.create({ data: { userId, matchId, team } })

  const updated = await db.user.findUnique({ where: { id: userId }, select: { coins: true } })
  return NextResponse.json({ success: true, coins: updated?.coins ?? 0 })
}
