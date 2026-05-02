import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const PRICES: Record<string, number> = {
  x2: 2,
  shinoo: 2,
  x3: 3,
  goals: 3,
  minute90: 2,
  split: 3,
}

const STOCK_FIELDS: Record<string, string> = {
  x2: 'x2Stock',
  shinoo: 'shinooStock',
  x3: 'x3Stock',
  goals: 'goalsStock',
  minute90: 'minute90Stock',
  split: 'splitStock',
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { item } = await request.json()
  if (!item || !PRICES[item]) return NextResponse.json({ error: 'פריט לא תקין' }, { status: 400 })

  const cost = PRICES[item]
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { coins: true, x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if (user.coins < cost) return NextResponse.json({ error: `אין מספיק מטבעות — עולה 🪙${cost}` }, { status: 400 })

  const stockField = STOCK_FIELDS[item]
  const updated = await db.user.update({
    where: { id: userId },
    data: { coins: { decrement: cost }, [stockField]: { increment: 1 } },
    select: { coins: true, x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true },
  })

  return NextResponse.json({
    ok: true,
    coins: updated.coins,
    x2Stock: updated.x2Stock,
    shinooStock: updated.shinooStock,
    x3Stock: updated.x3Stock,
    goalsStock: updated.goalsStock,
    minute90Stock: updated.minute90Stock,
    splitStock: updated.splitStock,
  })
}
