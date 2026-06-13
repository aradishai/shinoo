import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

let lastSyncTime = 0
let lastRedCardSyncTime = 0
let lastUpcomingSyncTime = 0
const MIN_INTERVAL_LIVE = 30_000
const MIN_INTERVAL_IDLE = 60_000
const RED_CARD_SYNC_INTERVAL = 4 * 60_000
const UPCOMING_SYNC_INTERVAL = 60 * 60_000

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY

const AF_API = 'https://v3.football.api-sports.io'
const AF_KEY = process.env.API_FOOTBALL_KEY

const FD_STATUS_MAP: Record<string, string> = {
  'TIMED': 'SCHEDULED',
  'SCHEDULED': 'SCHEDULED',
  'IN_PLAY': 'LIVE',
  'PAUSED': 'PAUSED',
  'FINISHED': 'FINISHED',
  'SUSPENDED': 'POSTPONED',
  'POSTPONED': 'POSTPONED',
  'CANCELLED': 'CANCELLED',
  'AWARDED': 'FINISHED',
}

async function syncFootballData() {
  if (!FD_KEY) return

  const activeTournaments = await db.tournament.findMany({ where: { isActive: true } })
  const slugs = activeTournaments.map(t => t.slug)
  const competitions = [
    ...(slugs.includes('world-cup-2026') ? ['WC'] : []),
    ...(slugs.some(s => s.includes('la-liga')) ? ['PD'] : []),
  ]
  if (competitions.length === 0) competitions.push('PD')
  const fetchResults = await Promise.allSettled(
    competitions.flatMap(comp => [
      axios.get(`${FD_API}/competitions/${comp}/matches?status=IN_PLAY,PAUSED`, {
        headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
      }),
      axios.get(`${FD_API}/competitions/${comp}/matches?status=FINISHED`, {
        headers: { 'X-Auth-Token': FD_KEY }, timeout: 8000,
      }),
    ])
  )

  const liveMatches = fetchResults
    .filter((_, i) => i % 2 === 0)
    .flatMap(r => r.status === 'fulfilled' ? (r.value.data?.matches ?? []) : [])

  const recentMatches = fetchResults
    .filter((_, i) => i % 2 === 1)
    .flatMap(r => r.status === 'fulfilled' ? (r.value.data?.matches ?? []) : [])

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentFinished = recentMatches.filter((m: any) => new Date(m.lastUpdated) > cutoff)
  const allMatches = [...liveMatches, ...recentFinished]

  for (const m of allMatches) {
    let match = await db.match.findUnique({ where: { providerMatchId: `fd-${m.id}` } })

    if (!match) {
      const SKIP = new Set(['FC', 'AC', 'AS', 'CD', 'CF', 'RC', 'RCD', 'SD', 'UD', 'SC', 'FK'])
      const findTeamFallback = async (apiTeam: any) => {
        if (!apiTeam) return null
        const byCode = await db.team.findFirst({ where: { code: apiTeam.tla } })
        if (byCode) return byCode
        const keyword = (apiTeam.name ?? '').split(' ').find((w: string) => w.length > 3 && !SKIP.has(w))
        if (!keyword) return null
        return db.team.findFirst({ where: { nameEn: { contains: keyword } } })
      }
      const homeTeam = await findTeamFallback(m.homeTeam)
      const awayTeam = await findTeamFallback(m.awayTeam)
      if (homeTeam && awayTeam) {
        const kickoffDate = new Date(m.utcDate)
        const from = new Date(kickoffDate.getTime() - 2 * 60 * 60 * 1000)
        const to = new Date(kickoffDate.getTime() + 2 * 60 * 60 * 1000)
        match = await db.match.findFirst({
          where: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, kickoffAt: { gte: from, lte: to }, providerMatchId: null }
        }) ?? null
        if (match) {
          await db.match.update({ where: { id: match.id }, data: { providerMatchId: `fd-${m.id}` } })
        }
      }
    }

    if (!match) continue

    const status = FD_STATUS_MAP[m.status] ?? match.status
    const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? match.homeScore
    const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? match.awayScore
    const hasScore = homeScore !== null && awayScore !== null

    await db.match.update({
      where: { id: match.id },
      data: { status, homeScore, awayScore },
    })

    if (hasScore) await recalculatePoints(match.id)

    if (status === 'FINISHED') {
      try {
        const claimed = await db.$executeRaw`UPDATE "Match" SET "coinsGranted" = true WHERE id = ${match.id} AND "coinsGranted" = false`
        if (claimed > 0) {
          const predictors = await db.prediction.findMany({
            where: { matchId: match.id }, select: { userId: true }, distinct: ['userId'],
          })
          for (const { userId } of predictors) {
            await db.user.update({ where: { id: userId }, data: { coins: { increment: 1 } } })
          }
        }
      } catch { /* coinsGranted column not yet in DB — skip until migration runs */ }
    }
  }
}

async function syncRedCards() {
  if (!AF_KEY) return
  const now = Date.now()
  if (now - lastRedCardSyncTime < RED_CARD_SYNC_INTERVAL) return
  lastRedCardSyncTime = now

  const liveMatches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED'] } },
    include: { homeTeam: true, awayTeam: true },
  })
  if (liveMatches.length === 0) return

  const res = await axios.get(`${AF_API}/fixtures?live=all`, {
    headers: { 'x-apisports-key': AF_KEY },
    timeout: 8000,
  })

  const fixtures: any[] = res.data?.response ?? []

  for (const match of liveMatches) {
    const kickoffMs = new Date(match.kickoffAt).getTime()
    const fixture = fixtures.find((f: any) => {
      const diff = Math.abs(new Date(f.fixture.date).getTime() - kickoffMs)
      if (diff > 2 * 60 * 60_000) return false
      const hName = (f.teams.home.name ?? '').toLowerCase()
      const aName = (f.teams.away.name ?? '').toLowerCase()
      const hEn = (match.homeTeam.nameEn ?? '').toLowerCase()
      const aEn = (match.awayTeam.nameEn ?? '').toLowerCase()
      const hMatch = hName.includes(hEn.split(' ')[0]) || hEn.includes(hName.split(' ')[0])
      const aMatch = aName.includes(aEn.split(' ')[0]) || aEn.includes(aName.split(' ')[0])
      return hMatch && aMatch
    })

    if (!fixture) continue

    const events: any[] = fixture.events ?? []
    const homeId = fixture.teams?.home?.id
    const awayId = fixture.teams?.away?.id
    const homeRedCards = events.filter((e: any) => e.team?.id === homeId && e.type === 'Card' && e.detail === 'Red Card').length
    const awayRedCards = events.filter((e: any) => e.team?.id === awayId && e.type === 'Card' && e.detail === 'Red Card').length

    await db.match.update({ where: { id: match.id }, data: { homeRedCards, awayRedCards } })
  }
}

async function syncUpcomingMatches() {
  if (!FD_KEY) return
  const now = Date.now()
  if (now - lastUpcomingSyncTime < UPCOMING_SYNC_INTERVAL) return
  lastUpcomingSyncTime = now

  const tournament = await db.tournament.findFirst({
    where: { isActive: true },
    orderBy: { id: 'desc' },
  })
  if (!tournament) return

  // Only sync upcoming La Liga matches — WC matches are managed by migrate-worldcup
  const activeTournamentsForUpcoming = await db.tournament.findMany({ where: { isActive: true } })
  const upcomingComps = activeTournamentsForUpcoming.some(t => t.slug.includes('la-liga')) ? ['PD'] : []
  for (const comp of upcomingComps) {
    try {
      const res = await axios.get(`${FD_API}/competitions/${comp}/matches?status=SCHEDULED,TIMED`, {
        headers: { 'X-Auth-Token': FD_KEY },
        timeout: 8000,
      })
      const matches: any[] = res.data?.matches ?? []

      for (const m of matches) {
        const providerMatchId = `fd-${m.id}`
        const existing = await db.match.findUnique({ where: { providerMatchId } })
        if (existing) continue

        const CODE_NORM: Record<string, string> = { ESP: 'ESP-NT', KSA: 'SAU', URY: 'URU', CUR: 'CUW', HTI: 'HAI' }
        const findTeam = async (apiTeam: any) => {
          if (!apiTeam?.tla) return null
          const code = CODE_NORM[apiTeam.tla] ?? apiTeam.tla
          const byCode = await db.team.findFirst({ where: { code } })
          if (byCode) return byCode
          return db.team.create({
            data: {
              nameEn: apiTeam.shortName ?? apiTeam.name ?? apiTeam.tla,
              nameHe: apiTeam.shortName ?? apiTeam.name ?? apiTeam.tla,
              code,
              flagUrl: apiTeam.crest ?? null,
            },
          })
        }

        const homeTeam = await findTeam(m.homeTeam)
        const awayTeam = await findTeam(m.awayTeam)
        if (!homeTeam || !awayTeam) continue

        const kickoffAt = new Date(m.utcDate)
        const idealLockAt = new Date(kickoffAt.getTime() - 60 * 60_000)
        const lockAt = idealLockAt < new Date() ? kickoffAt : idealLockAt

        await db.match.create({
          data: {
            tournamentId: tournament.id,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            kickoffAt,
            lockAt,
            status: 'SCHEDULED',
            providerMatchId,
            round: m.matchday ? `מחזור ${m.matchday}` : null,
          },
        })
      }
    } catch (err) {
      console.error(`[syncUpcoming] ${comp} error:`, err)
    }
  }
}

async function lockExpiredMatches() {
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() } },
    data: { status: 'LOCKED' },
  })
}

async function autoFinishStaleMatches() {
  const staleTime = new Date(Date.now() - 115 * 60 * 1000)
  const staleMatches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] }, kickoffAt: { lte: staleTime } },
    select: { id: true },
  })
  if (staleMatches.length === 0) return

  const staleIds = staleMatches.map(m => m.id)
  await db.match.updateMany({
    where: { id: { in: staleIds } },
    data: { status: 'FINISHED' },
  })

  let grantIds: string[] = []
  try {
    const claimed = await db.$queryRawUnsafe<{ id: string }[]>(
      `UPDATE "Match" SET "coinsGranted" = true WHERE id IN (${staleIds.map((_, i) => `$${i + 1}`).join(',')}) AND "coinsGranted" = false RETURNING id`,
      ...staleIds
    )
    grantIds = claimed.map(r => r.id)
  } catch { /* coinsGranted column not yet in DB */ }

  for (const matchId of grantIds) {
    const predictors = await db.prediction.findMany({
      where: { matchId }, select: { userId: true }, distinct: ['userId'],
    })
    for (const { userId } of predictors) {
      await db.user.update({ where: { id: userId }, data: { coins: { increment: 1 } } })
    }
  }
}

async function deduplicateMatches() {
  // Find matches that share the same two teams on the same day (in either order)
  const dupes = await db.$queryRaw<{ keep_id: string; dup_id: string }[]>`
    SELECT DISTINCT
      LEAST(a.id, b.id) AS keep_id,
      GREATEST(a.id, b.id) AS dup_id
    FROM "Match" a
    JOIN "Match" b ON (
      a.id <> b.id
      AND a."tournamentId" = b."tournamentId"
      AND ABS(EXTRACT(EPOCH FROM (a."kickoffAt" - b."kickoffAt"))) < 86400
      AND (
        (a."homeTeamId" = b."homeTeamId" AND a."awayTeamId" = b."awayTeamId")
        OR
        (a."homeTeamId" = b."awayTeamId" AND a."awayTeamId" = b."homeTeamId")
      )
    )
    WHERE a."tournamentId" IS NOT NULL
  `
  if (dupes.length === 0) return
  const toDelete = dupes.map(d => d.dup_id)
  await db.match.deleteMany({ where: { id: { in: toDelete } } })
}

async function recalculateMissingPoints() {
  const finished = await db.match.findMany({
    where: {
      status: { in: ['FINISHED', 'PAUSED', 'LIVE'] },
      homeScore: { not: null },
      awayScore: { not: null },
      predictions: { some: { points: null } },
    },
    select: { id: true },
  })
  for (const m of finished) await recalculatePoints(m.id)
}

export async function GET() {
  try {
    const now = Date.now()
    const timeSinceLast = now - lastSyncTime

    const activeCount = await db.match.count({
      where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
    })

    const minInterval = activeCount > 0 ? MIN_INTERVAL_LIVE : MIN_INTERVAL_IDLE

    let synced = false
    if (timeSinceLast >= minInterval) {
      lastSyncTime = now
      await lockExpiredMatches()
      await syncFootballData()
      await syncUpcomingMatches()
      await autoFinishStaleMatches()
      await recalculateMissingPoints()
      await deduplicateMatches()
      synced = true
    }

    const liveCount = await db.match.count({ where: { status: { in: ['LIVE', 'PAUSED'] } } })
    if (liveCount > 0) {
      await syncRedCards()
    }

    const liveMatchData = await db.match.findMany({
      where: { status: { in: ['LIVE', 'PAUSED'] } },
      select: { id: true, status: true, homeScore: true, awayScore: true, homeRedCards: true, awayRedCards: true },
    })

    return NextResponse.json({
      synced,
      activeMatches: activeCount,
      nextSyncIn: synced ? minInterval : Math.max(0, minInterval - timeSinceLast),
      liveMatchData,
    })
  } catch (error) {
    console.error('[sync/live] Error:', error)
    return NextResponse.json({ synced: false, activeMatches: 0, nextSyncIn: MIN_INTERVAL_IDLE, liveMatchData: [] })
  }
}
