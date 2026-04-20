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
  '1H': 'LIVE', 'HT': 'LIVE', '2H': 'LIVE', 'ET': 'LIVE', 'BT': 'LIVE',
  'Match Postponed': 'POSTPONED',
  'Match Cancelled': 'CANCELLED',
}

async function main() {
  console.log('⚽ מסנכרן ליגה ספרדית מ-TheSportsDB...')

  // 1. Upsert tournament
  const tournament = await db.tournament.upsert({
    where: { slug: SLUG },
    update: { isActive: true },
    create: { name: 'La Liga', nameHe: 'ליגה ספרדית', slug: SLUG, type: 'league', isActive: true, season: SEASON },
  })
  console.log(`✅ טורניר: ${tournament.name}`)

  // 2. Fetch events first — try full season, fall back to next+past
  let events: any[] = []

  for (const s of [SEASON, '2025', '2026', '2024-2025', '2024']) {
    try {
      const res = await axios.get(`${BASE}/eventsseason.php`, { params: { id: LEAGUE_ID, s }, timeout: 12000 })
      const found = res.data?.events ?? []
      if (found.length > 0) { events = found; console.log(`📋 עונה ${s}: ${found.length} אירועים`); break }
    } catch { /* try next */ }
  }

  if (events.length === 0) {
    console.log('ℹ️  eventsseason ריק — משתמש ב-next/past events')
    const [nextRes, pastRes] = await Promise.all([
      axios.get(`${BASE}/eventsnextleague.php`, { params: { id: LEAGUE_ID }, timeout: 12000 }),
      axios.get(`${BASE}/eventspastleague.php`, { params: { id: LEAGUE_ID }, timeout: 12000 }),
    ])
    events = [...(nextRes.data?.events ?? []), ...(pastRes.data?.events ?? [])]
  }

  console.log(`📋 סה"כ אירועים: ${events.length}`)

  // 3. Extract unique teams FROM events (not from lookup_all_teams — avoids season mismatch)
  const teamEntries = new Map<string, { name: string; badge: string | null }>()
  for (const e of events) {
    if (e.idHomeTeam) teamEntries.set(String(e.idHomeTeam), {
      name: e.strHomeTeam,
      badge: e.strHomeTeamBadge || null,
    })
    if (e.idAwayTeam) teamEntries.set(String(e.idAwayTeam), {
      name: e.strAwayTeam,
      badge: e.strAwayTeamBadge || null,
    })
  }

  console.log(`🏟️  קבוצות שנמצאו: ${teamEntries.size}`)

  const teamMap: Record<string, string> = {}
  for (const [tsdbId, info] of teamEntries) {
    const team = await db.team.upsert({
      where: { code: tsdbId },
      update: { nameEn: info.name, nameHe: info.name, ...(info.badge ? { flagUrl: info.badge } : {}) },
      create: { code: tsdbId, nameEn: info.name, nameHe: info.name, flagUrl: info.badge },
    })
    teamMap[tsdbId] = team.id
  }
  console.log(`✅ קבוצות: ${Object.keys(teamMap).length}`)

  // 4. Upsert matches
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  let synced = 0, finished = 0, skipped = 0

  for (const e of events) {
    if (!e.dateEvent || !e.strTime) continue

    const homeTeamId = teamMap[String(e.idHomeTeam)]
    const awayTeamId = teamMap[String(e.idAwayTeam)]
    if (!homeTeamId || !awayTeamId) { skipped++; continue }

    const kickoffAt = new Date(`${e.dateEvent}T${e.strTime}Z`)
    if (kickoffAt < cutoff) continue

    const lockAt = new Date(kickoffAt.getTime() - 60 * 60 * 1000)
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
        homeTeamId, awayTeamId,
        kickoffAt, lockAt, status, homeScore, awayScore,
        providerMatchId,
        round: e.intRound ? `Jornada ${e.intRound}` : undefined,
      },
    })

    if (status === 'FINISHED' && homeScore !== null && awayScore !== null && existing?.status !== 'FINISHED') {
      await recalculatePoints(match.id)
      finished++
    }

    synced++
  }

  console.log(`✅ משחקים: ${synced} (דולגו: ${skipped}, ${finished} נקודות חושבו מחדש)`)
  console.log('🎉 סנכרון ליגה ספרדית הושלם!')
}

main()
  .catch(e => { console.error('❌ שגיאת סנכרון:', e.message); process.exit(1) })
  .finally(() => db.$disconnect())
