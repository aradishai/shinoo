import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

const CL_TEAMS = [
  { nameHe: 'פריז סן-ז\'רמן', nameEn: 'Paris Saint-Germain', code: 'PSG', flagUrl: 'https://crests.football-data.org/524.png' },
  { nameHe: 'בייארן מינכן',   nameEn: 'Bayern Munich',        code: 'BAY', flagUrl: 'https://crests.football-data.org/5.png'   },
  { nameHe: 'אטלטיקו מדריד', nameEn: 'Atletico Madrid',      code: 'ATM', flagUrl: 'https://crests.football-data.org/78.png'  },
  { nameHe: 'ארסנל',          nameEn: 'Arsenal',              code: 'ARS', flagUrl: 'https://crests.football-data.org/57.png'  },
]

// Kickoff 21:00 CET = 19:00 UTC (May = UTC+2 in CET, Israel = UTC+3)
const CL_MATCHES = [
  { home: 'PSG', away: 'BAY', date: '2026-04-29T19:00:00Z', round: 'חצי גמר | רגל 1' },
  { home: 'ATM', away: 'ARS', date: '2026-04-30T19:00:00Z', round: 'חצי גמר | רגל 1' },
  { home: 'ARS', away: 'ATM', date: '2026-05-06T19:00:00Z', round: 'חצי גמר | רגל 2' },
  { home: 'BAY', away: 'PSG', date: '2026-05-07T19:00:00Z', round: 'חצי גמר | רגל 2' },
]

export async function POST(request: Request) {
  const { secret } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tournament = await db.tournament.upsert({
    where: { slug: 'cl-2026' },
    update: {},
    create: { name: 'UEFA Champions League 2025/26', nameHe: 'ליגת האלופות 2026', slug: 'cl-2026', type: 'champions_league', isActive: true, season: '2026' },
  })

  const teamMap: Record<string, string> = {}
  for (const t of CL_TEAMS) {
    const team = await db.team.upsert({
      where: { code: t.code },
      update: { nameHe: t.nameHe, nameEn: t.nameEn, flagUrl: t.flagUrl },
      create: { nameHe: t.nameHe, nameEn: t.nameEn, code: t.code, flagUrl: t.flagUrl },
    })
    teamMap[t.code] = team.id
  }

  const added: string[] = []
  for (const m of CL_MATCHES) {
    const existing = await db.match.findFirst({
      where: { tournamentId: tournament.id, homeTeamId: teamMap[m.home], awayTeamId: teamMap[m.away] }
    })
    if (existing) continue

    const kickoffAt = new Date(m.date)
    const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000)
    await db.match.create({
      data: { tournamentId: tournament.id, homeTeamId: teamMap[m.home], awayTeamId: teamMap[m.away], kickoffAt, lockAt, status: 'SCHEDULED', round: m.round },
    })
    added.push(`${m.home} vs ${m.away}`)
  }

  return NextResponse.json({ ok: true, tournament: tournament.nameHe, teams: Object.keys(teamMap), added })
}
