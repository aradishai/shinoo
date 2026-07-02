import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const matches = await db.match.findMany({
    include: { homeTeam: true, awayTeam: true, tournament: true },
    orderBy: { kickoffAt: 'asc' },
    take: 100,
  })

  const byTournament: Record<string, any[]> = {}
  for (const m of matches) {
    const key = `${m.tournament?.slug ?? 'none'} | active=${m.tournament?.isActive}`
    if (!byTournament[key]) byTournament[key] = []
    byTournament[key].push(`${m.homeTeam.nameEn} vs ${m.awayTeam.nameEn} (${m.status})`)
  }

  return NextResponse.json(byTournament)
}
