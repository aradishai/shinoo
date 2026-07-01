import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, username, matchId, powerup } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findFirst({ where: { username } })
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const field = `${powerup}Applied`
  const result = await db.prediction.updateMany({
    where: { userId: user.id, matchId },
    data: { [field]: true } as any,
  })

  return NextResponse.json({ ok: true, updated: result.count })
}
