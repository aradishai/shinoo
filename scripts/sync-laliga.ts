import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { recalculatePoints } from '../lib/sync-service'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

const BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const LEAGUE_ID = 4335
const SEASON = '2025-2026'
const SLUG = 'laliga-2025-2026'

const STATUS_MAP: Record<string, string> = {
  'Not Started': 'SCHEDULED',
  'Match Finished': 'FINISHED',
  'After Extra Time': 'FINISHED',
  'After Penalties': 'FINISHED',
  '1H': 'LIVE',
  'HT': 'LIVE',
  '2H': 'LIVE',
  'ET': 'LIVE',
  'BT': 'LIVE',
  'Match Postponed': 'POSTPONED',
  'Match Cancelled': 'CANCELLED',
}

async function main() {
  console.log('⚽ מסנכרן ליגה ספרדית מ-TheSportsDB...')

  // 1. Upsert tournament
  const tournament = await db.tournament.upsert({
    where: { slug: SLUG },
    update: { isActive: true },
    create: {
      name: 'La Liga',
      nameHe: 'ליגה ספרדית',
      slug: SLUG,
      type: 'league',
      isActive: true,
      season: SEASON,
    },
  })
  console.log(`✅ טורניר: ${tournament.name}`)

  // 2. Fetch and upsert teams
  const teamsRes = await axios.get(`${BASE}/lookup_all_teams.php`, {
    params: { id: LEAGUE_ID },
    timeout: 15000,
  })
  const teams: any[] = teamsRes.data?.teams ?? []

  const teamMap: Record<string, string> = {}
  for (const t of teams) {
    const code = String(t.idTeam)
    const team = await db.team.upsert({
      where: { code },
      update: {
        nameEn: t.strTeam,
        nameHe: t.strTeam,
        flagUrl: t.strTeamBadge || null,
      },
      create: {
        code,
        nameEn: t.strTeam,
        nameHe: t.strTeam,
        flagUrl: t.strTeamBadge || null,
      },
    })
    teamMap[code] = team.id
  }
  console.log(`✅ קבוצות: ${Object.keys(teamMap).length}`)

  // 3. Fetch and upsert fixtures (recent + future only)
  const fixturesRes = await axios.get(`${BASE}/eventsseason.php`, {
    params: { id: LEAGUE_ID, s: SEASON },
    timeout: 15000,
  })
  const events: any[] = fixturesRes.data?.events ?? []

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  let synced = 0
  let finished = 0

  for (const e of events) {
    if (!e.dateEvent || !e.strTime) continue

    const homeCode = String(e.idHomeTeam)
    const awayCode = String(e.idAwayTeam)
    const homeTeamId = teamMap[homeCode]
    const awayTeamId = teamMap[awayCode]
    if (!homeTeamId || !awayTeamId) continue

    const kickoffAt = new Date(`${e.dateEvent}T${e.strTime}Z`)
    if (kickoffAt < cutoff) continue

    const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000) // lock 1h before
    const status = STATUS_MAP[e.strStatus ?? ''] ?? 'SCHEDULED'
    const homeScore = e.intHomeScore !== null && e.intHomeScore !== '' ? Number(e.intHomeScore) : null
    const awayScore = e.intAwayScore !== null && e.intAwayScore !== '' ? Number(e.intAwayScore) : null
    const providerMatchId = String(e.idEvent)

    const existing = await db.match.findUnique({ where: { providerMatchId } })

    const match = await db.match.upsert({
      where: { providerMatchId },
      update: { status, homeScore, awayScore, kickoffAt, lockAt },
      create: {
        tournamentId: tournament.id,
        homeTeamId,
        awayTeamId,
        kickoffAt,
        lockAt,
        status,
        homeScore,
        awayScore,
        providerMatchId,
        round: e.intRound ? `Jornada ${e.intRound}` : undefined,
      },
    })

    // Recalculate points when a match just became FINISHED
    if (status === 'FINISHED' && homeScore !== null && awayScore !== null) {
      const wasFinished = existing?.status === 'FINISHED'
      if (!wasFinished) {
        await recalculatePoints(match.id)
        finished++
      }
    }

    synced++
  }

  console.log(`✅ משחקים: ${synced} (${finished} חדשים שהסתיימו — נקודות חושבו מחדש)`)
  console.log('🎉 סנכרון ליגה ספרדית הושלם!')
}

main()
  .catch(e => { console.error('❌ שגיאת סנכרון:', e.message); process.exit(1) })
  .finally(() => db.$disconnect())
