import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY

const FD_STATUS_MAP: Record<string, string> = {
  'TIMED': 'SCHEDULED', 'SCHEDULED': 'SCHEDULED',
  'IN_PLAY': 'LIVE', 'PAUSED': 'PAUSED',
  'FINISHED': 'FINISHED', 'SUSPENDED': 'POSTPONED',
  'POSTPONED': 'POSTPONED', 'CANCELLED': 'CANCELLED', 'AWARDED': 'FINISHED',
}

async function lockExpiredMatches() {
  await db.match.updateMany({
    where: { status: 'SCHEDULED', lockAt: { lte: new Date() } },
    data: { status: 'LOCKED' },
  })
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

  const SKIP = new Set(['FC', 'AC', 'AS', 'CD', 'CF', 'RC', 'RCD', 'SD', 'UD', 'SC', 'FK'])

  for (const m of allMatches) {
    let match = await db.match.findUnique({ where: { providerMatchId: `fd-${m.id}` } })

    if (!match) {
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
      data: { status, homeScore, awayScore, ...(m.minute != null ? { minute: m.minute } : {}) },
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
    await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "minuteAt" TIMESTAMP(3)`
    await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "coinsGranted" BOOLEAN NOT NULL DEFAULT false`
    await lockExpiredMatches()
    await syncFootballData()
    await autoFinishStaleMatches()
    await recalculateMissingPoints()
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (error) {
    console.error('[sync/lifecycle]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
