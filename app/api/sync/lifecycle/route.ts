import { NextResponse } from 'next/server'
import { recalculatePoints } from '@/lib/sync-service'
import { db } from '@/lib/db'
import axios from 'axios'
import webpush from 'web-push'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:aradishai10@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
}

export const dynamic = 'force-dynamic'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY
const AF_API = 'https://v3.football.api-sports.io'
const AF_KEY = process.env.FOOTBALL_API_KEY

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

async function liveStartedMatches() {
  // Transition LOCKED → LIVE when kickoff time has passed (no API key needed)
  await db.match.updateMany({
    where: { status: 'LOCKED', kickoffAt: { lte: new Date() } },
    data: { status: 'LIVE' },
  })
}

async function syncFootballData() {
  if (!FD_KEY) return
  const activeTournaments = await db.tournament.findMany({ where: { isActive: true } })
  const slugs = activeTournaments.map(t => t.slug)
  const competitions = [
    ...(slugs.some(s => s.includes('world-cup')) ? ['WC'] : []),
    ...(slugs.some(s => s.includes('la-liga')) ? ['PD'] : []),
    ...(slugs.some(s => s.includes('champions-league')) ? ['CL'] : []),
  ]
  if (competitions.length === 0) return
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
    // Don't overwrite score of an already-finished match — only update live/in-progress scores
    const alreadyFinished = match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null
    const homeScore = alreadyFinished ? match.homeScore : (m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? match.homeScore)
    const awayScore = alreadyFinished ? match.awayScore : (m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? match.awayScore)
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
  const staleTime = new Date(Date.now() - 150 * 60 * 1000)
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

async function syncMissingScoresFromApiSports() {
  if (!AF_KEY) return
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  // Sync ALL active matches (with or without score) + unscored finished matches
  const matches = await db.match.findMany({
    where: {
      status: { in: ['LIVE', 'PAUSED', 'LOCKED', 'FINISHED'] },
      kickoffAt: { gte: twoDaysAgo },
      OR: [
        { homeScore: null },
        { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] } },
      ],
    },
    include: { homeTeam: true, awayTeam: true },
  })
  if (matches.length === 0) return

  // Group by date to minimize API calls
  const byDate: Record<string, typeof matches> = {}
  for (const m of matches) {
    const d = m.kickoffAt.toISOString().slice(0, 10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(m)
  }

  const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO']
  const liveStatuses = ['1H', '2H', 'ET', 'P', 'INT', 'LIVE']
  const pausedStatuses = ['HT', 'BT']

  for (const [dateStr, dayMatches] of Object.entries(byDate)) {
    try {
      const res = await axios.get(`${AF_API}/fixtures`, {
        params: { date: dateStr, league: 1, season: 2026 },
        headers: { 'x-apisports-key': AF_KEY },
        timeout: 8000,
      })
      const fixtures: any[] = res.data?.response ?? []

      for (const match of dayMatches) {
        const kickoffMs = new Date(match.kickoffAt).getTime()
        const fixture = fixtures.find((f: any) => {
          const diff = Math.abs(new Date(f.fixture.date).getTime() - kickoffMs)
          if (diff > 2 * 60 * 60_000) return false
          const hName = (f.teams.home.name ?? '').toLowerCase()
          const aName = (f.teams.away.name ?? '').toLowerCase()
          const hEn = (match.homeTeam.nameEn ?? '').toLowerCase()
          const aEn = (match.awayTeam.nameEn ?? '').toLowerCase()
          return (hName.includes(hEn.split(' ')[0]) || hEn.includes(hName.split(' ')[0])) &&
                 (aName.includes(aEn.split(' ')[0]) || aEn.includes(aName.split(' ')[0]))
        })
        if (!fixture) continue

        const afStatus = fixture.fixture?.status?.short
        const isFinishedByApi = finishedStatuses.includes(afStatus)
        // Use fulltime (90 min) score, not goals which includes extra time
        const homeScore = fixture.score?.fulltime?.home ?? fixture.goals?.home
        const awayScore = fixture.score?.fulltime?.away ?? fixture.goals?.away

        // For active matches: update score and mark FINISHED only when api says FT
        // For scoreless finished matches: fill in the score
        if (homeScore === null || homeScore === undefined) continue

        const newStatus = isFinishedByApi ? 'FINISHED'
          : liveStatuses.includes(afStatus) ? 'LIVE'
          : pausedStatuses.includes(afStatus) ? 'PAUSED'
          : match.status
        await db.match.update({
          where: { id: match.id },
          data: { homeScore, awayScore, status: newStatus, providerMatchId: String(fixture.fixture.id) },
        })
        await recalculatePoints(match.id)
      }
    } catch { /* silent */ }
  }
}

async function sendMatchReminders() {
  if (!process.env.VAPID_PUBLIC_KEY) return

  const now = new Date()
  const windowStart = new Date(now.getTime() + 110 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 125 * 60 * 1000)

  const matches = await db.match.findMany({
    where: {
      status: { in: ['SCHEDULED', 'TIMED'] },
      kickoffAt: { gte: windowStart, lte: windowEnd },
      reminderSent: false,
    },
    include: { homeTeam: true, awayTeam: true },
  })

  if (matches.length === 0) return

  const allSubs = await db.pushSubscription.findMany()

  for (const match of matches) {
    const title = `⚽ משחק בעוד שעתיים!`
    const body = `${match.homeTeam.nameHe} נגד ${match.awayTeam.nameHe}`

    for (const sub of allSubs) {
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: '/matches' })
      ).catch((err: unknown) => {
        const status = (err as { statusCode?: number })?.statusCode
        console.error(`match reminder push failed (${status}):`, String(err))
        if (status === 404 || status === 410) {
          db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
        }
      })
    }

    await db.match.update({ where: { id: match.id }, data: { reminderSent: true } })
  }
}

async function sendMatchSummaryMessages() {
  const unsummarized = await db.$queryRaw<{ id: string; homeScore: number; awayScore: number; homeTeamName: string; awayTeamName: string }[]>`
    SELECT m.id, m."homeScore", m."awayScore", ht."nameHe" as "homeTeamName", at."nameHe" as "awayTeamName"
    FROM "Match" m
    JOIN "Team" ht ON m."homeTeamId" = ht.id
    JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE m.status = 'FINISHED' AND m."homeScore" IS NOT NULL AND m."summarySent" = false
  `
  if (unsummarized.length === 0) return

  const adminUser = await db.user.findFirst({ where: { username: 'ערד' } })
  if (!adminUser) return

  for (const match of unsummarized) {
    const predictions = await db.$queryRaw<{ leagueId: string; username: string; totalPoints: number | null }[]>`
      SELECT p."leagueId", u.username, pp."totalPoints"
      FROM "Prediction" p
      JOIN "User" u ON p."userId" = u.id
      LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
      WHERE p."matchId" = ${match.id}
      ORDER BY pp."totalPoints" DESC NULLS LAST
    `
    if (predictions.length === 0) {
      await db.$executeRaw`UPDATE "Match" SET "summarySent" = true WHERE id = ${match.id}`
      continue
    }

    // Group by league
    const byLeague: Record<string, typeof predictions> = {}
    for (const p of predictions) {
      if (!byLeague[p.leagueId]) byLeague[p.leagueId] = []
      byLeague[p.leagueId].push(p)
    }

    for (const [leagueId, preds] of Object.entries(byLeague)) {
      const NL = "\n"
      const PTS = "נק'"
      const lines = preds.map(p => p.username + ": " + (p.totalPoints ?? 0) + " " + PTS).join(NL)
      const title = match.awayTeamName + "|" + match.awayScore + ":" + match.homeScore + "|" + match.homeTeamName
      const content = title + NL + lines
      await db.message.create({ data: { leagueId, userId: adminUser.id, content, isSystem: true } })

      // Check streaks per user in this league
      const allPreds = await db.$queryRaw<{ userId: string; username: string; resultPoints: number | null }[]>`
        SELECT p."userId", u.username, pp."resultPoints"
        FROM "Prediction" p
        JOIN "User" u ON p."userId" = u.id
        JOIN "Match" m ON p."matchId" = m.id
        LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
        WHERE p."leagueId" = ${leagueId} AND m.status = 'FINISHED'
        ORDER BY m."kickoffAt" DESC, p."userId"
      `
      const byUser: Record<string, { username: string; resultPoints: number | null }[]> = {}
      for (const row of allPreds) {
        if (!byUser[row.userId]) byUser[row.userId] = []
        byUser[row.userId].push(row)
      }
      const streakLines: string[] = []
      for (const records of Object.values(byUser)) {
        if (!records.length) continue
        const username = records[0].username
        let streak = 0
        for (const r of records) {
          if ((r.resultPoints ?? 0) > 0) streak++
          else break
        }
        if (streak >= 5) streakLines.push(`🔥 ${username} ON FIRE עם ${streak} ניחושים מוצלחים ברצף!`)
      }
      if (streakLines.length > 0) {
        await db.message.create({ data: { leagueId, userId: adminUser.id, content: streakLines.join('\n'), isSystem: true } })
      }
    }

    await db.$executeRaw`UPDATE "Match" SET "summarySent" = true WHERE id = ${match.id}`
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
    await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "summarySent" BOOLEAN NOT NULL DEFAULT false`
    await db.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allinStock" INTEGER NOT NULL DEFAULT 0`
    await db.$executeRaw`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "allinApplied" BOOLEAN NOT NULL DEFAULT false`
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS "AllInPool" (id TEXT PRIMARY KEY, "matchId" TEXT NOT NULL, "leagueId" TEXT NOT NULL, resolved BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE("matchId","leagueId"))`
    await db.$executeRaw`CREATE TABLE IF NOT EXISTS "AllInEntry" (id TEXT PRIMARY KEY, "poolId" TEXT NOT NULL REFERENCES "AllInPool"(id), "userId" TEXT NOT NULL, "predictionId" TEXT NOT NULL UNIQUE, "pointsWon" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`
    // Fix matches that were created with 3-hour lockAt instead of 1-hour
    await db.$executeRaw`UPDATE "Match" SET "lockAt" = "kickoffAt" - INTERVAL '1 hour' WHERE status = 'SCHEDULED' AND "lockAt" < "kickoffAt" - INTERVAL '90 minutes'`
    // Restore France vs Senegal to LIVE (was prematurely finished)
    await db.$executeRaw`UPDATE "Match" SET status = 'LIVE' WHERE id = 'cmobmm5c6004p12r2w8wx0pa9' AND status = 'FINISHED'`
    // Fix Saudi Arabia vs Uruguay wrong kickoff time (DB has 20:00 UTC, actual is 22:00 UTC = 01:00 IDT)
    await db.$executeRaw`UPDATE "Match" SET "kickoffAt" = '2026-06-15T22:00:00.000Z', "lockAt" = '2026-06-15T21:00:00.000Z' WHERE id = 'cmobmm5br004k12r2sb1j3zyl' AND "kickoffAt" = '2026-06-15T20:00:00.000Z'`
    // Fix Uruguay vs Cape Verde wrong kickoff time (DB has 20:00 UTC, actual is 22:00 UTC = 01:00 IDT June 22)
    await db.$executeRaw`UPDATE "Match" SET "kickoffAt" = '2026-06-21T22:00:00.000Z', "lockAt" = '2026-06-21T21:00:00.000Z' WHERE id = 'cmobmm5bx004m12r2ryl3w7x3' AND "kickoffAt" = '2026-06-21T20:00:00.000Z'`
    // Delete duplicate matches (wrong home/away order + wrong time)
    await db.$executeRaw`DELETE FROM "Prediction" WHERE "matchId" IN ('cmobmm5dg005512r2ygi95sho', 'cmobmm5cy004z12r288o12ocg')`
    await db.$executeRaw`DELETE FROM "Match" WHERE id IN ('cmobmm5dg005512r2ygi95sho', 'cmobmm5cy004z12r288o12ocg')`
    // Revoke 10 coins mistakenly granted for test matchday 999
    await db.$executeRaw`UPDATE "User" SET coins = GREATEST(0, coins - 10) WHERE id IN (SELECT "userId" FROM "PowerupUsage" WHERE type = 'coins_matchday_999')`
    await db.$executeRaw`DELETE FROM "PowerupUsage" WHERE type = 'coins_matchday_999'`
    await lockExpiredMatches()
    await liveStartedMatches()
    await syncFootballData()
    await syncMissingScoresFromApiSports()
    await autoFinishStaleMatches()
    await recalculateMissingPoints()
    // Spain vs Saudi Arabia: API erroneously reports 5:0, real score was 4:0
    await db.$executeRaw`UPDATE "Match" SET "homeScore" = 4 WHERE id = 'cmobmm5bu004l12r2e39r1pw2' AND "homeScore" = 5`
    await recalculatePoints('cmobmm5bu004l12r2e39r1pw2')
    await sendMatchSummaryMessages()
    await sendMatchReminders()
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (error) {
    console.error('[sync/lifecycle]', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

