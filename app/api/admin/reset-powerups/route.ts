import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = 'shinoo-admin-2026'

export async function POST(request: Request) {
  try {
    const { secret, userId, username, includeLive } = await request.json()
    if (secret !== SECRET)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    if (!userId && !username)
      return NextResponse.json({ error: 'userId or username required' }, { status: 400 })

    const userWhere = userId ? { id: userId } : { username }
    const user = await db.user.findFirst({ where: userWhere, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })
    const resolvedUserId = user.id

    const matchStatuses = includeLive ? ['SCHEDULED', 'LIVE', 'PAUSED', 'LOCKED'] : ['SCHEDULED']
    const predictions = await (db.prediction as any).findMany({
      where: { userId: resolvedUserId, match: { status: { in: matchStatuses } } },
    })

    const refund = { x2: 0, shinoo: 0, x3: 0, goals: 0, minute90: 0, split: 0 }

    for (const p of predictions) {
      if (!p.x2Applied && !p.shinooApplied && !p.x3Applied && !p.goalsApplied && !p.minute90Applied && !p.splitApplied) continue

      if (p.x2Applied) refund.x2++
      if (p.shinooApplied) refund.shinoo++
      if (p.x3Applied) refund.x3++
      if (p.goalsApplied) refund.goals++
      if (p.minute90Applied) refund.minute90++
      if (p.splitApplied) refund.split++

      await (db.prediction as any).update({
        where: { id: p.id },
        data: {
          x2Applied: false,
          shinooApplied: false,
          x3Applied: false,
          goalsApplied: false,
          minute90Applied: false,
          splitApplied: false,
          splitHomeScore2: null,
          splitAwayScore2: null,
        },
      })
    }

    await (db.user as any).update({
      where: { id: resolvedUserId },
      data: {
        x2Stock: { increment: refund.x2 },
        shinooStock: { increment: refund.shinoo },
        x3Stock: { increment: refund.x3 },
        goalsStock: { increment: refund.goals },
        minute90Stock: { increment: refund.minute90 },
        splitStock: { increment: refund.split },
      },
    })

    return NextResponse.json({ ok: true, refunded: refund, predictionsReset: predictions.filter((p: any) => p.x2Applied || p.shinooApplied || p.x3Applied || p.goalsApplied || p.minute90Applied || p.splitApplied).length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
