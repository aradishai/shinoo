import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'
// v2

export const dynamic = 'force-dynamic'

let lastSyncTime = 0
const MIN_INTERVAL_LIVE = 30_000
const MIN_INTERVAL_IDLE = 60_000


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

  const competitions = ['PD', 'CL']
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

  let claimedIds: string[] = []
  try {
    await db.$executeRawUnsafe(
      `UPDATE "Match" SET "coinsGranted" = true WHERE id IN (${staleIds.map((_, i) => `$${i + 1}`).join(',')}) AND "coinsGranted" = false`,
      ...staleIds
    )
    claimedIds = staleIds
  } catch { /* coinsGranted column not yet in DB */ }

  for (const { id: matchId } of staleMatches) {
    if (!claimedIds.includes(matchId)) continue
    const predictors = await db.prediction.findMany({
      where: { matchId }, select: { userId: true }, distinct: ['userId'],
    })
    for (const { userId } of predictors) {
      await db.user.update({ where: { id: userId }, data: { coins: { increment: 1 } } })
    }
  }
}

function matchNeedsMinuteUpdate(match: { kickoffAt: Date; minuteAt: Date | null; minute: number | null }): boolean {
  const now = Date.now()
  const kickoffMs = match.kickoffAt.getTime()
  const minuteAtMs = match.minuteAt ? match.minuteAt.getTime() : null

  // No previous reading — always fetch
  if (minuteAtMs === null) return true

  // Sanity check: if dead-reckoning is >20 min behind kickoff, anchor is stale → force refresh
  const kickoffElapsed = (now - kickoffMs) / 60_000
  const deadReckoning = (match.minute ?? 0) + (now - minuteAtMs) / 60_000
  if (kickoffElapsed - deadReckoning > 20) return true

  // Regular 4-min throttle anchored to last DB update (survives server restarts)
  if (now - minuteAtMs >= 4 * 60_000) return true

  // Trigger points: kickoff+45, kickoff+60, kickoff+108 min
  const nowFromKickoff = (now - kickoffMs) / 60_000
  const lastFromKickoff = (minuteAtMs - kickoffMs) / 60_000
  for (const t of [45, 60, 108]) {
    if (nowFromKickoff >= t && lastFromKickoff < t) return true
  }

  return false
}

async function syncLiveMinutes() {
  if (!AF_KEY) return

  const liveMatches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED'] } },
    include: { homeTeam: true, awayTeam: true },
  })

  if (liveMatches.length === 0) return

  const toUpdate = liveMatches.filter(m => matchNeedsMinuteUpdate(m as any))
  if (toUpdate.length === 0) return

  const res = await axios.get(`${AF_API}/fixtures?live=all`, {
    headers: { 'x-apisports-key': AF_KEY },
    timeout: 8000,
  })

  const fixtures: any[] = res.data?.response ?? []

  for (const match of toUpdate) {
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

    const minute = fixture.fixture?.status?.elapsed ?? null
    const events: any[] = fixture.events ?? []
    const homeId = fixture.teams?.home?.id
    const awayId = fixture.teams?.away?.id
    const homeRedCards = events.filter((e: any) => e.team?.id === homeId && e.type === 'Card' && e.detail === 'Red Card').length
    const awayRedCards = events.filter((e: any) => e.team?.id === awayId && e.type === 'Card' && e.detail === 'Red Card').length

    const updateData: any = { homeRedCards, awayRedCards }

    if (minute != null) {
      const prevMinute = match.minute ?? -1
      const isFirstReading = match.minuteAt == null

      const kickoffMs = new Date(match.kickoffAt).getTime()
      if (isFirstReading || minute > prevMinute) {
        updateData.minute = minute
        // Anchor minuteAt to the match-clock position, not wall-clock now.
        // Dead-reckoning: minute + (now - minuteAt)/60000 = kickoffElapsed,
        // so stale API data (minute=4 at 91' elapsed) still shows ~91'.
        updateData.minuteAt = new Date(kickoffMs + minute * 60_000)
      }
      // If minute <= prevMinute: stale/no-progress API — don't touch minute or minuteAt
    }

    await db.match.update({ where: { id: match.id }, data: updateData })
  }
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
      await autoFinishStaleMatches()
      await recalculateMissingPoints()
      synced = true
    }

    // Minute sync: per-match scheduling via matchNeedsMinuteUpdate
    const liveCount = await db.match.count({ where: { status: { in: ['LIVE', 'PAUSED'] } } })
    if (liveCount > 0) {
      await syncLiveMinutes()
    }

    const liveMatchData = await db.match.findMany({
      where: { status: { in: ['LIVE', 'PAUSED'] } },
      select: { id: true, status: true, homeScore: true, awayScore: true, minute: true, minuteAt: true, homeRedCards: true, awayRedCards: true },
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
