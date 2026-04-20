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

  // 2. Always fetch next+past events (reliable), also try full season for historical data
  console.log('📡 מושך משחקים עתידיים ואחרונים...')
  const [nextRes, pastRes] = await Promise.all([
    axios.get(`${BASE}/eventsnextleague.php`, { params: { id: LEAGUE_ID }, timeout: 12000 }).catch(() => ({ data: {} })),
    axios.get(`${BASE}/eventspastleague.php`, { params: { id: LEAGUE_ID }, timeout: 12000 }).catch(() => ({ data: {} })),
  ])
  const nextEvents: any[] = nextRes.data?.events ?? []
  const pastEvents: any[] = pastRes.data?.events ?? []
  console.log(`📋 עתידיים: ${nextEvents.length}, אחרונים: ${pastEvents.length}`)

  let events: any[] = [...nextEvents, ...pastEvents]

  // Also try full season for additional historical matches
  for (const s of [SEASON, '2025', '2026']) {
    try {
      const res = await axios.get(`${BASE}/eventsseason.php`, { params: { id: LEAGUE_ID, s }, timeout: 12000 })
      const found: any[] = res.data?.events ?? []
      if (found.length > 0) {
        console.log(`📋 עונה ${s}: ${found.length} אירועים (מיזוג)`)
        const existingIds = new Set(events.map((e: any) => String(e.idEvent)))
        const newOnes = found.filter((e: any) => !existingIds.has(String(e.idEvent)))
        events = [...events, ...newOnes]
        break
      }
    } catch { /* try next */ }
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
  for (const [tsdbId, info] of Array.from(teamEntries)) {
    const team = await db.team.upsert({
      where: { code: tsdbId },
      update: { nameEn: info.name, nameHe: info.name, ...(info.badge ? { flagUrl: info.badge } : {}) },
      create: { code: tsdbId, nameEn: info.name, nameHe: info.name, flagUrl: info.badge },
    })
    teamMap[tsdbId] = team.id
  }
  console.log(`✅ קבוצות: ${Object.keys(teamMap).length}`)

  // 4. Upsert matches
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  let synced = 0, finished = 0, skipped = 0

  for (const e of events) {
    if (!e.dateEvent) continue
    if (!e.strTime) {
      console.log(`⚠️  ללא שעה: ${e.strHomeTeam} vs ${e.strAwayTeam} (${e.dateEvent}) — מדלג`)
      continue
    }

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
