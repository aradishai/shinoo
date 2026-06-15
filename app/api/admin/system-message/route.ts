import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(req: Request) {
  const { secret, leagueName, content } = await req.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const league = await db.league.findFirst({ where: { name: { contains: leagueName } } })
  if (!league) return NextResponse.json({ error: 'league not found' }, { status: 404 })

  const adminUser = await db.user.findFirst({ where: { username: 'ערד' } })
  if (!adminUser) return NextResponse.json({ error: 'admin user not found' }, { status: 404 })

  const message = await db.message.create({
    data: { leagueId: league.id, userId: adminUser.id, content, isSystem: true },
  })

  return NextResponse.json({ ok: true, messageId: message.id, league: league.name })
}
