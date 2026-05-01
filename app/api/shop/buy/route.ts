import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const PRICES: Record<string, number> = {
  x2: 2,
  shinoo: 2,
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { item } = await request.json()
  if (!item || !PRICES[item]) return NextResponse.json({ error: 'פריט לא תקין' }, { status: 400 })

  const cost = PRICES[item]
  const user = await db.user.findUnique({ where: { id: userId }, select: { coins: true, x2Stock: true, shinooStock: true } })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if (user.coins < cost) return NextResponse.json({ error: `אין מספיק מטבעות — עולה 🪙${cost}` }, { status: 400 })

  const stockField = item === 'x2' ? 'x2Stock' : 'shinooStock'
  const updated = await db.user.update({
    where: { id: userId },
    data: { coins: { decrement: cost }, [stockField]: { increment: 1 } },
    select: { coins: true, x2Stock: true, shinooStock: true },
  })

  return NextResponse.json({ ok: true, coins: updated.coins, x2Stock: updated.x2Stock, shinooStock: updated.shinooStock })
}
