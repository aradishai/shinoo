import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const leagues = await db.league.findMany({ select: { id: true, name: true } })
  return NextResponse.json({ leagues })
}

export async function POST(req: Request) {
  const { secret, leagueName, leagueId, content } = await req.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const league = leagueId
    ? await db.league.findUnique({ where: { id: leagueId } })
    : await db.league.findFirst({ where: { name: { contains: leagueName, mode: 'insensitive' } } })
  if (!league) return NextResponse.json({ error: 'league not found' }, { status: 404 })

  const adminUser = await db.user.findFirst({ where: { username: 'ערד' } })
  if (!adminUser) return NextResponse.json({ error: 'admin user not found' }, { status: 404 })

  const message = await db.message.create({
    data: { leagueId: league.id, userId: adminUser.id, content, isSystem: true },
  })

  return NextResponse.json({ ok: true, messageId: message.id, league: league.name })
}
