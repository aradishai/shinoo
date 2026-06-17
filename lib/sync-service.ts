import { db } from './db'
import { getFootballProvider } from './football-provider'
import { calculatePoints, calculateGoalsPoints } from './scoring-engine'

const provider = getFootballProvider()

export async function syncFixtures(): Promise<void> {
  console.log('[sync] Starting fixture sync...')

  const tournaments = await db.tournament.findMany({ where: { isActive: true } })

  for (const tournament of tournaments) {
    console.log(`[sync] Syncing tournament: ${tournament.name} (season ${tournament.season})`)

    const fixtures = await provider.getFixtures(tournament.id, tournament.season)

    for (const fixture of fixtures) {
      const homeTeam = await db.team.findFirst({
        where: { code: fixture.homeTeamCode },
      })
      const awayTeam = await db.team.findFirst({
        where: { code: fixture.awayTeamCode },
      })

      if (!homeTeam || !awayTeam) {
        console.warn(`[sync] Skipping match — teams not found: ${fixture.homeTeamCode} vs ${fixture.awayTeamCode}`)
        continue
      }

      const lockAt = new Date(fixture.kickoffAt.getTime() - 60 * 60 * 1000)

      const statusMap: Record<string, string> = {
        SCHEDULED: 'SCHEDULED',
        LOCKED: 'LOCKED',
        LIVE: 'LIVE',
        FINISHED: 'FINISHED',
        CANCELLED: 'CANCELLED',
        POSTPONED: 'POSTPONED',
      }

      const matchStatus = statusMap[fixture.status] || 'SCHEDULED'

      await db.match.upsert({
        where: { providerMatchId: fixture.providerMatchId },
        update: {
          status: matchStatus,
          homeScore: fixture.homeScore ?? null,
          awayScore: fixture.awayScore ?? null,
          kickoffAt: fixture.kickoffAt,
          lockAt,
        },
        create: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt: fixture.kickoffAt,
          lockAt,
          status: matchStatus,
          homeScore: fixture.homeScore ?? null,
          awayScore: fixture.awayScore ?? null,
          providerMatchId: fixture.providerMatchId,
          round: fixture.round,
        },
      })
    }

    console.log(`[sync] Synced ${fixtures.length} fixtures for ${tournament.name}`)
  }
}

export async function syncLiveResults(): Promise<void> {
  console.log('[sync] Syncing live results...')

  const tournaments = await db.tournament.findMany({ where: { isActive: true } })

  for (const tournament of tournaments) {
    const liveMatches = await provider.getLiveMatches(tournament.id)

    for (const liveMatch of liveMatches) {
      const match = await db.match.findUnique({
        where: { providerMatchId: liveMatch.providerMatchId },
      })

      if (!match) continue

      await db.match.update({
        where: { id: match.id },
        data: {
          status: 'LIVE',
          homeScore: liveMatch.homeScore ?? match.homeScore,
          awayScore: liveMatch.awayScore ?? match.awayScore,
        },
      })
    }
  }
}

export async function syncMatchScorers(matchId: string): Promise<void> {
  console.log(`[sync] Syncing scorers for match ${matchId}`)

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  })

  if (!match || !match.providerMatchId) return

  const scorers = await provider.getMatchScorers(match.providerMatchId)

  const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players]

  for (const scorer of scorers) {
    // Try to match by name similarity
    const player = allPlayers.find(
      (p) =>
        p.nameEn.toLowerCase().includes(scorer.playerName.toLowerCase()) ||
        scorer.playerName.toLowerCase().includes(p.nameEn.toLowerCase())
    )

    if (!player) {
      console.warn(`[sync] Player not found in DB: ${scorer.playerName}`)
      continue
    }

    await db.matchScorer.upsert({
      where: { matchId_playerId: { matchId: match.id, playerId: player.id } },
      update: { goals: scorer.goals },
      create: {
        matchId: match.id,
        playerId: player.id,
        goals: scorer.goals,
      },
    })
  }
}

export async function recalculatePoints(matchId: string): Promise<void> {
  console.log(`[sync] Recalculating points for match ${matchId}`)

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      scorers: true,
    },
  })

  if (!match || match.homeScore === null || match.awayScore === null) {
    console.warn(`[sync] Match ${matchId} has no result yet`)
    return
  }

  const actualTopScorerIds = match.scorers.map((s) => s.playerId)

  const predictions = await db.prediction.findMany({
    where: { matchId },
  })

  const isFinished = match.status === 'FINISHED'

  for (const prediction of predictions) {
    const existingPoints = await db.predictionPoints.findUnique({
      where: { predictionId: prediction.id },
      select: { id: true },
    })
    const isFirstCalc = !existingPoints

    const result = calculatePoints(
      prediction.predictedHomeScore,
      prediction.predictedAwayScore,
      match.homeScore,
      match.awayScore,
    )

    let basePoints: number
    let baseExplanation: string

    if ((prediction as any).goalsApplied) {
      // GOALS+: only score if trend correct, points based on goal accuracy only
      const goalsResult = calculateGoalsPoints(
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        match.homeScore,
        match.awayScore,
      )
      basePoints = goalsResult.resultPoints
      baseExplanation = goalsResult.explanation
    } else {
      basePoints = result.resultPoints
      baseExplanation = result.explanation

      // SPLIT: take the better of two predictions
      if ((prediction as any).splitApplied && (prediction as any).splitHomeScore2 !== null && (prediction as any).splitAwayScore2 !== null) {
        const result2 = calculatePoints(
          (prediction as any).splitHomeScore2,
          (prediction as any).splitAwayScore2,
          match.homeScore,
          match.awayScore,
        )
        if (result2.resultPoints > basePoints) {
          basePoints = result2.resultPoints
          baseExplanation = result2.explanation + ' (ספליט 2)'
        }
      }
    }

    // Multiplier (X3 > X2, can't both be applied)
    let multipliedPoints = basePoints
    if ((prediction as any).x3Applied) multipliedPoints = basePoints * 3
    else if (prediction.x2Applied) multipliedPoints = basePoints * 2

    const totalPoints = multipliedPoints + result.topScorerPoints

    const parts: string[] = [baseExplanation]
    if ((prediction as any).splitApplied && !(prediction as any).goalsApplied) parts.push('ספליט')
    if ((prediction as any).x3Applied) parts.push(`X3: ${multipliedPoints}`)
    else if (prediction.x2Applied) parts.push(`X2: ${multipliedPoints}`)
    const explanation = parts.join(' | ')

    await db.predictionPoints.upsert({
      where: { predictionId: prediction.id },
      update: {
        resultPoints: result.resultPoints,
        topScorerPoints: result.topScorerPoints,
        totalPoints,
        explanation,
      },
      create: {
        predictionId: prediction.id,
        resultPoints: result.resultPoints,
        topScorerPoints: result.topScorerPoints,
        totalPoints,
        explanation,
      },
    })

  }

  console.log(`[sync] Recalculated points for ${predictions.length} predictions`)

  // Resolve ALL IN pools for this match if it's finished
  if (isFinished) {
    await resolveAllInPools(matchId)
  }
}

export async function resolveAllInPools(matchId: string): Promise<void> {
  const pools = await db.allInPool.findMany({
    where: { matchId, resolved: false },
    include: { entries: true },
  })

  for (const pool of pools) {
    if (pool.entries.length < 2) {
      // Refund single participant — give back their points as-is
      await db.allInPool.update({ where: { id: pool.id }, data: { resolved: true } })
      continue
    }

    // Get each participant's current totalPoints
    const withPoints = await Promise.all(
      pool.entries.map(async (e) => {
        const pp = await db.predictionPoints.findUnique({
          where: { predictionId: e.predictionId },
          select: { totalPoints: true, predictionId: true },
        })
        return { ...e, totalPoints: pp?.totalPoints ?? 0 }
      })
    )

    const pot = withPoints.reduce((s, e) => s + e.totalPoints, 0)
    const maxPts = Math.max(...withPoints.map(e => e.totalPoints))
    const winners = withPoints.filter(e => e.totalPoints === maxPts)
    const share = Math.floor(pot / winners.length)

    for (const entry of withPoints) {
      const isWinner = winners.some(w => w.id === entry.id)
      const pointsWon = isWinner ? share : 0

      // Update PredictionPoints totalPoints to reflect ALL IN outcome
      await db.predictionPoints.update({
        where: { predictionId: entry.predictionId },
        data: { totalPoints: pointsWon },
      })

      await db.allInEntry.update({
        where: { id: entry.id },
        data: { pointsWon },
      })
    }

    await db.allInPool.update({ where: { id: pool.id }, data: { resolved: true } })
  }
}

export async function updateMatchStatuses(): Promise<void> {
  console.log('[sync] Updating match statuses...')

  const now = new Date()

  // Lock matches 3h before kickoff
  const matchesToLock = await db.match.findMany({
    where: {
      status: 'SCHEDULED',
      lockAt: { lte: now },
    },
  })

  for (const match of matchesToLock) {
    await db.match.update({
      where: { id: match.id },
      data: { status: 'LOCKED' },
    })
    console.log(`[sync] Locked match ${match.id}`)
  }

  // Mark finished matches and recalculate points
  const finishedMatches = await db.match.findMany({
    where: {
      status: 'LIVE',
      providerMatchId: { not: null },
    },
  })

  for (const match of finishedMatches) {
    if (!match.providerMatchId) continue

    const result = await provider.getMatchResult(match.providerMatchId)
    if (!result) continue

    if (result.status === 'FINISHED') {
      await db.match.update({
        where: { id: match.id },
        data: {
          status: 'FINISHED',
          homeScore: result.homeScore,
          awayScore: result.awayScore,
        },
      })

      await syncMatchScorers(match.id)
      await recalculatePoints(match.id)

      // Grant 1 coin to each user who predicted this match
      const predictors = await db.prediction.findMany({
        where: { matchId: match.id },
        select: { userId: true },
        distinct: ['userId'],
      })
      for (const { userId: predictorId } of predictors) {
        await db.user.update({
          where: { id: predictorId },
          data: { coins: { increment: 1 } },
        })
      }
    } else {
      // Update live score + sync real elapsed minute from provider
      await db.match.update({
        where: { id: match.id },
        data: {
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          ...(result.elapsed != null ? { minute: result.elapsed } : {}),
        },
      })
    }
  }

  // Proactive end-of-match check:
  // Any LIVE or LOCKED match whose kickoffAt was 115+ minutes ago must be checked,
  // even if we missed the transition to LIVE (e.g. due to sync gaps or late start).
  const cutoff115 = new Date(now.getTime() - 115 * 60 * 1000)
  const overdueMatches = await db.match.findMany({
    where: {
      status: { in: ['LIVE', 'LOCKED'] },
      kickoffAt: { lte: cutoff115 },
      providerMatchId: { not: null },
    },
  })

  for (const match of overdueMatches) {
    if (!match.providerMatchId) continue
    console.log(`[sync] Proactive end-of-match check for match ${match.id} (${Math.floor((now.getTime() - match.kickoffAt.getTime()) / 60000)}min elapsed)`)

    const result = await provider.getMatchResult(match.providerMatchId)
    if (!result) continue

    if (result.status === 'FINISHED') {
      await db.match.update({
        where: { id: match.id },
        data: { status: 'FINISHED', homeScore: result.homeScore, awayScore: result.awayScore },
      })
      await syncMatchScorers(match.id)
      await recalculatePoints(match.id)
      const predictors = await db.prediction.findMany({
        where: { matchId: match.id },
        select: { userId: true },
        distinct: ['userId'],
      })
      for (const { userId: predictorId } of predictors) {
        await db.user.update({ where: { id: predictorId }, data: { coins: { increment: 1 } } })
      }
      console.log(`[sync] Proactive close: match ${match.id} marked FINISHED`)
    } else if (match.status === 'LOCKED') {
      // Match should be live but wasn't marked — fix the status
      await db.match.update({
        where: { id: match.id },
        data: {
          status: 'LIVE',
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          ...(result.elapsed != null ? { minute: result.elapsed } : {}),
        },
      })
      console.log(`[sync] Proactive fix: match ${match.id} LOCKED→LIVE`)
    }
  }

  console.log('[sync] Status update complete')
}

// Main sync runner (called via npm run sync)
async function main() {
  try {
    await syncFixtures()
    await syncLiveResults()
    await updateMatchStatuses()
  } catch (error) {
    console.error('[sync] Fatal error:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Only run if called directly
if (require.main === module) {
  main()
}
