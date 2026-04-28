import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

const CL_TEAMS = [
  { nameHe: 'פריז סן-ז\'רמן', nameEn: 'Paris Saint-Germain', code: 'PSG', flagUrl: 'https://crests.football-data.org/524.png' },
  { nameHe: 'באיירן מינכן',   nameEn: 'Bayern Munich',        code: 'BAY', flagUrl: 'https://crests.football-data.org/5.png'   },
  { nameHe: 'אטלטיקו מדריד', nameEn: 'Atletico Madrid',      code: 'ATM', flagUrl: 'https://crests.football-data.org/78.png'  },
  { nameHe: 'ארסנל',          nameEn: 'Arsenal',              code: 'ARS', flagUrl: 'https://crests.football-data.org/57.png'  },
]

// Israel time = CET+1 (UTC+2 in winter, UTC+3 in summer — May is UTC+3)
// Kickoff 21:00 CET = 22:00 Israel = 19:00 UTC
const CL_MATCHES = [
  // Semi-final 1 — PSG vs Bayern
  { home: 'PSG', away: 'BAY', date: '2026-04-29T19:00:00Z', round: 'חצי גמר | רגל 1' },
  { home: 'BAY', away: 'PSG', date: '2026-05-07T19:00:00Z', round: 'חצי גמר | רגל 2' },
  // Semi-final 2 — Atletico vs Arsenal
  { home: 'ATM', away: 'ARS', date: '2026-04-30T19:00:00Z', round: 'חצי גמר | רגל 1' },
  { home: 'ARS', away: 'ATM', date: '2026-05-06T19:00:00Z', round: 'חצי גמר | רגל 2' },
  // Final — Budapest
  { home: 'TBD1', away: 'TBD2', date: '2026-05-30T19:00:00Z', round: 'גמר' },
]

async function main() {
  console.log('🌱 זורע ליגת האלופות...')

  const tournament = await db.tournament.upsert({
    where: { slug: 'cl-2026' },
    update: {},
    create: { name: 'UEFA Champions League 2025/26', nameHe: 'ליגת האלופות 2026', slug: 'cl-2026', type: 'champions_league', isActive: true, season: '2026' },
  })
  console.log('✅ טורניר:', tournament.nameHe)

  const teamMap: Record<string, string> = {}
  for (const t of CL_TEAMS) {
    const team = await db.team.upsert({
      where: { code: t.code },
      update: { nameHe: t.nameHe, nameEn: t.nameEn, flagUrl: t.flagUrl },
      create: { nameHe: t.nameHe, nameEn: t.nameEn, code: t.code, flagUrl: t.flagUrl },
    })
    teamMap[t.code] = team.id
  }
  console.log('✅ קבוצות:', Object.keys(teamMap).join(', '))

  let mc = 0
  for (const m of CL_MATCHES) {
    if (!teamMap[m.home] || !teamMap[m.away]) {
      console.log('⏩ דילוג על גמר (קבוצות עוד לא ידועות):', m.round)
      continue
    }
    const kickoffAt = new Date(m.date)
    const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000) // lock 1h before kickoff

    const existing = await db.match.findFirst({
      where: { tournamentId: tournament.id, homeTeamId: teamMap[m.home], awayTeamId: teamMap[m.away] }
    })
    if (existing) {
      console.log('⏩ כבר קיים:', m.home, 'vs', m.away)
      continue
    }

    await db.match.create({
      data: { tournamentId: tournament.id, homeTeamId: teamMap[m.home], awayTeamId: teamMap[m.away], kickoffAt, lockAt, status: 'SCHEDULED', round: m.round },
    })
    mc++
    console.log('✅', m.home, 'vs', m.away, '-', m.round)
  }

  console.log(`\n🎉 ${mc} משחקים נוספו!`)
}

main().catch(e => { console.error('❌', e); process.exit(1) }).finally(() => db.$disconnect())
