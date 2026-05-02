import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { secret, userId, amount } = await request.json()
    if (secret !== 'shinoo-admin-2026')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const updated = await db.user.update({
      where: { id: userId },
      data: { coins: { increment: amount ?? 10 } },
      select: { coins: true, username: true },
    })

    return NextResponse.json({ ok: true, username: updated.username, coins: updated.coins })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
