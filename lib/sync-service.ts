import { db } from './db'
import { getFootballProvider } from './football-provider'
import { calculatePoints } from './scoring-engine'

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

      const lockAt = new Date(fixture.kickoffAt.getTime() - 3 * 60 * 60 * 1000)

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

  for (const prediction of predictions) {
    const result = calculatePoints(
      prediction.predictedHomeScore,
      prediction.predictedAwayScore,
      match.homeScore,
      match.awayScore,
    )

    let basePoints = result.resultPoints

    // SPLIT: take the better of two predictions
    if ((prediction as any).splitApplied && (prediction as any).splitHomeScore2 !== null && (prediction as any).splitAwayScore2 !== null) {
      const result2 = calculatePoints(
        (prediction as any).splitHomeScore2,
        (prediction as any).splitAwayScore2,
        match.homeScore,
        match.awayScore,
      )
      basePoints = Math.max(basePoints, result2.resultPoints)
    }

    // GOALS+: each goal scored adds 1 point
    const goalsBonus = (prediction as any).goalsApplied ? (match.homeScore + match.awayScore) : 0

    // Multiplier (X3 > X2, can't both be applied)
    let multipliedPoints = basePoints
    if ((prediction as any).x3Applied) multipliedPoints = basePoints * 3
    else if (prediction.x2Applied) multipliedPoints = basePoints * 2

    const totalPoints = multipliedPoints + goalsBonus + result.topScorerPoints

    const parts: string[] = [result.explanation]
    if ((prediction as any).splitApplied) parts.push('ספליט')
    if ((prediction as any).x3Applied) parts.push(`X3: ${multipliedPoints}`)
    else if (prediction.x2Applied) parts.push(`X2: ${multipliedPoints}`)
    if (goalsBonus > 0) parts.push(`גולס+: +${goalsBonus}`)
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
      // Update live score
      await db.match.update({
        where: { id: match.id },
        data: {
          homeScore: result.homeScore,
          awayScore: result.awayScore,
        },
      })
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
