import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const PRICES: Record<string, number> = {
  x2: 4,
  shinoo: 3,
  x3: 8,
  goals: 5,
  minute90: 1,
  split: 3,
  allin: 1,
  double: 3,
  peek: 2,
}

const STOCK_FIELDS: Record<string, string> = {
  x2: 'x2Stock',
  shinoo: 'shinooStock',
  x3: 'x3Stock',
  goals: 'goalsStock',
  minute90: 'minute90Stock',
  split: 'splitStock',
  allin: 'allinStock',
  double: 'doubleStock',
  peek: 'peekStock',
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { item } = await request.json()
  if (!item || !PRICES[item]) return NextResponse.json({ error: 'פריט לא תקין' }, { status: 400 })

  const cost = PRICES[item]
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { coins: true, x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true, allinStock: true, doubleStock: true, peekStock: true } as any,
  })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if ((user as any).coins < cost) return NextResponse.json({ error: `אין מספיק מטבעות — עולה 🪙${cost}` }, { status: 400 })

  const stockField = STOCK_FIELDS[item]
  const updated = await db.user.update({
    where: { id: userId },
    data: { coins: { decrement: cost }, [stockField]: { increment: 1 } } as any,
    select: { coins: true, x2Stock: true, shinooStock: true, x3Stock: true, goalsStock: true, minute90Stock: true, splitStock: true, allinStock: true, doubleStock: true, peekStock: true } as any,
  })

  return NextResponse.json({
    ok: true,
    coins: (updated as any).coins,
    x2Stock: (updated as any).x2Stock,
    shinooStock: (updated as any).shinooStock,
    x3Stock: (updated as any).x3Stock,
    goalsStock: (updated as any).goalsStock,
    minute90Stock: (updated as any).minute90Stock,
    splitStock: (updated as any).splitStock,
    allinStock: (updated as any).allinStock,
    doubleStock: (updated as any).doubleStock,
    peekStock: (updated as any).peekStock,
  })
}
