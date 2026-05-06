import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { recalculatePoints } from '../lib/sync-service'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter } as any)

const BASE = 'https://www.thesportsdb.com/api/v1/json/3'
const LEAGUE_ID = 4331
const SEASON = '2025-2026'
const SLUG = 'bundesliga-2025-2026'

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
  console.log('⚽ מסנכרן בונדסליגה מ-TheSportsDB...')

  const tournament = await db.tournament.upsert({
    where: { slug: SLUG },
    update: { isActive: true },
    create: { name: 'Bundesliga', nameHe: 'בונדסליגה', slug: SLUG, type: 'bundesliga', isActive: true, season: SEASON },
  })
  console.log(`✅ טורניר: ${tournament.name}`)

  let events: any[] = []
  for (const s of [SEASON, '2025', '2024', '2024-2025']) {
    try {
      const res = await axios.get(`${BASE}/eventsseason.php`, { params: { id: LEAGUE_ID, s }, timeout: 15000 })
      const found: any[] = res.data?.events ?? []
      if (found.length > 0) { events = found; console.log(`📋 עונה ${s}: ${found.length} אירועים`); break }
    } catch { /* try next */ }
  }

  if (events.length === 0) { console.log('⚠️  לא נמצאו אירועים'); }
  console.log(`📋 סה"כ אירועים: ${events.length}`)

  const teamEntries = new Map<string, { name: string; badge: string | null }>()
  for (const e of events) {
    if (e.idHomeTeam) teamEntries.set(String(e.idHomeTeam), { name: e.strHomeTeam, badge: e.strHomeTeamBadge || null })
    if (e.idAwayTeam) teamEntries.set(String(e.idAwayTeam), { name: e.strAwayTeam, badge: e.strAwayTeamBadge || null })
  }

  const teamMap: Record<string, string> = {}
  for (const [tsdbId, info] of Array.from(teamEntries)) {
    const team = await db.team.upsert({
      where: { code: tsdbId },
      update: { nameEn: info.name, nameHe: info.name, ...(info.badge ? { flagUrl: info.badge } : {}) },
      create: { code: tsdbId, nameEn: info.name, nameHe: info.name, flagUrl: info.badge },
    })
    teamMap[tsdbId] = team.id
  }
  console.log(`✅ קבוצות: ${Object.keys(teamMap).length}`)

  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  let synced = 0, finished = 0, skipped = 0

  for (const e of events) {
    if (!e.dateEvent || !e.strTime) { skipped++; continue }
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
      create: { tournamentId: tournament.id, homeTeamId, awayTeamId, kickoffAt, lockAt, status, homeScore, awayScore, providerMatchId, round: e.intRound ? `Spieltag ${e.intRound}` : e.strRound || undefined },
    })

    if (status === 'FINISHED' && homeScore !== null && awayScore !== null && existing?.status !== 'FINISHED') {
      await recalculatePoints(match.id); finished++
    }
    synced++
  }

  console.log(`✅ משחקים: ${synced} (דולגו: ${skipped}, ${finished} נקודות חושבו מחדש)`)
  console.log('🎉 סנכרון בונדסליגה הושלם!')
}

main()
  .catch(e => { console.error('❌ שגיאת סנכרון:', e.message); process.exit(1) })
  .finally(() => db.$disconnect())
