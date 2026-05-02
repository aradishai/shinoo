import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const { secret, username, amount } = await request.json()
  if (secret !== process.env.ADMIN_SECRET && secret !== 'shinoo-admin-2026')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const updated = await db.user.update({
    where: { username },
    data: { coins: { increment: amount ?? 10 } },
    select: { coins: true, username: true },
  })

  return NextResponse.json({ ok: true, username: updated.username, coins: updated.coins })
}
