import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, username, item, amount } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findFirst({ where: { username }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const field = `${item}Stock`
  await (db.user as any).update({
    where: { id: user.id },
    data: { [field]: { increment: amount ?? 5 } },
  })

  return NextResponse.json({ ok: true, added: amount ?? 5, item: field })
}
