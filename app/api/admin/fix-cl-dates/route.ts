import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

const FIXES = [
  { home: 'PSG', away: 'BAY', date: '2026-04-28T19:00:00Z' },
  { home: 'ATM', away: 'ARS', date: '2026-04-29T19:00:00Z' },
  { home: 'ARS', away: 'ATM', date: '2026-05-06T19:00:00Z' },
  { home: 'BAY', away: 'PSG', date: '2026-05-05T19:00:00Z' },
]

export async function POST(request: Request) {
  const { secret } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const results = []
  for (const fix of FIXES) {
    const homeTeam = await db.team.findUnique({ where: { code: fix.home } })
    const awayTeam = await db.team.findUnique({ where: { code: fix.away } })
    if (!homeTeam || !awayTeam) continue

    const match = await db.match.findFirst({
      where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id }
    })
    if (!match) continue

    const kickoffAt = new Date(fix.date)
    const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000)
    await db.match.update({
      where: { id: match.id },
      data: { kickoffAt, lockAt, round: 'חצי גמר' }
    })
    results.push(`${fix.home} vs ${fix.away} → ${kickoffAt.toISOString()}`)
  }

  return NextResponse.json({ ok: true, updated: results })
}
