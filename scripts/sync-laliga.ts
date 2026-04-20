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

  // 3. Fetch fixtures — try season first, fall back to next+past events
  let events: any[] = []

  for (const s of [SEASON, '2025', '2026']) {
    try {
      const res = await axios.get(`${BASE}/eventsseason.php`, {
        params: { id: LEAGUE_ID, s },
        timeout: 15000,
      })
      const found = res.data?.events ?? []
      if (found.length > 0) { events = found; break }
    } catch { /* try next */ }
  }

  // Fall back to next + past events if season endpoint returned nothing
  if (events.length === 0) {
    console.log('ℹ️  eventsseason ריק — משתמש ב-next/past events')
    const [nextRes, pastRes] = await Promise.all([
      axios.get(`${BASE}/eventsnextleague.php`, { params: { id: LEAGUE_ID }, timeout: 15000 }),
      axios.get(`${BASE}/eventspastleague.php`, { params: { id: LEAGUE_ID }, timeout: 15000 }),
    ])
    events = [
      ...(nextRes.data?.events ?? []),
      ...(pastRes.data?.events ?? []),
    ]
  }

  console.log(`📋 אירועים שהתקבלו: ${events.length}`)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // חודש אחרון
  // Build name→id map as fallback
  const nameMap: Record<string, string> = {}
  for (const t of teams) {
    nameMap[t.strTeam?.toLowerCase()] = teamMap[String(t.idTeam)]
  }

  let synced = 0
  let finished = 0
  let skipped = 0

  for (const e of events) {
    if (!e.dateEvent || !e.strTime) continue

    const homeCode = String(e.idHomeTeam)
    const awayCode = String(e.idAwayTeam)
    const homeTeamId = teamMap[homeCode] || nameMap[e.strHomeTeam?.toLowerCase()]
    const awayTeamId = teamMap[awayCode] || nameMap[e.strAwayTeam?.toLowerCase()]
    if (!homeTeamId || !awayTeamId) {
      console.log(`⚠️  קבוצה לא נמצאה: ${e.strHomeTeam} (${homeCode}) vs ${e.strAwayTeam} (${awayCode})`)
      skipped++
      continue
    }

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

  console.log(`✅ משחקים: ${synced} (דולגו: ${skipped}, ${finished} נקודות חושבו מחדש)`)
  console.log('🎉 סנכרון ליגה ספרדית הושלם!')
}

main()
  .catch(e => { console.error('❌ שגיאת סנכרון:', e.message); process.exit(1) })
  .finally(() => db.$disconnect())
