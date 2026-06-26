const { Pool } = require('pg')
const { randomBytes } = require('crypto')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
function cuid() { return 'c' + randomBytes(11).toString('hex').slice(0, 24) }

function getOutcome(h, a) { return h > a ? 'home' : h < a ? 'away' : 'draw' }

function calcPoints(ph, pa, ah, aa) {
  const po = getOutcome(ph, pa), ao = getOutcome(ah, aa)
  const exact = ph === ah && pa === aa
  if (exact) return 5
  if (po !== ao) return 0
  if (ph === ah || pa === aa) return 3
  if (ao === 'draw') return 2
  return 1
}

function calcGoalsPoints(ph, pa, ah, aa) {
  if (getOutcome(ph, pa) !== getOutcome(ah, aa)) return 0
  return ah + aa
}

async function main() {
  // 1. Find Spain vs Saudi Arabia
  const matchRes = await pool.query(`
    SELECT m.id, m."homeScore", m."awayScore", m.status,
           ht.code as home, at.code as away
    FROM "Match" m
    JOIN "Team" ht ON m."homeTeamId" = ht.id
    JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE (ht.code IN ('ESP','KSA') AND at.code IN ('ESP','KSA'))
       OR (ht."nameHe" ILIKE '%ספרד%' AND at."nameHe" ILIKE '%סעוד%')
       OR (ht."nameHe" ILIKE '%סעוד%' AND at."nameHe" ILIKE '%ספרד%')
  `)

  if (matchRes.rows.length === 0) {
    console.error('Match not found!')
    await pool.end(); return
  }

  const match = matchRes.rows[0]
  console.log(`Found: ${match.home} vs ${match.away} | current score: ${match.homeScore}:${match.awayScore} | status: ${match.status}`)

  const matchId = match.id
  // Spain is home → homeScore=4, awayScore=0
  const ACTUAL_HOME = 4
  const ACTUAL_AWAY = 0

  // 2. Update match score
  await pool.query(`
    UPDATE "Match" SET "homeScore" = $1, "awayScore" = $2
    WHERE id = $3
  `, [ACTUAL_HOME, ACTUAL_AWAY, matchId])
  console.log(`Updated match score to ${ACTUAL_HOME}:${ACTUAL_AWAY}`)

  // 3. Get all predictions for this match
  const preds = await pool.query(`
    SELECT p.*, u.username
    FROM "Prediction" p
    JOIN "User" u ON p."userId" = u.id
    WHERE p."matchId" = $1
  `, [matchId])
  console.log(`\nRecalculating ${preds.rows.length} predictions...`)

  for (const p of preds.rows) {
    const ph = p.predictedHomeScore, pa = p.predictedAwayScore

    let basePoints
    let explanation

    if (p.goalsApplied) {
      basePoints = calcGoalsPoints(ph, pa, ACTUAL_HOME, ACTUAL_AWAY)
      explanation = `גולס+ — ${basePoints} נקודות`
    } else {
      basePoints = calcPoints(ph, pa, ACTUAL_HOME, ACTUAL_AWAY)
      explanation = `${basePoints} נקודות`

      // SPLIT: take better
      if (p.splitApplied && p.splitHomeScore2 !== null && p.splitAwayScore2 !== null) {
        const pts2 = calcPoints(p.splitHomeScore2, p.splitAwayScore2, ACTUAL_HOME, ACTUAL_AWAY)
        if (pts2 > basePoints) {
          basePoints = pts2
          explanation += ' (ספליט 2)'
        }
      }
    }

    // Multiplier
    let multiplied = basePoints
    if (p.x3Applied) multiplied = basePoints * 3
    else if (p.x2Applied) multiplied = basePoints * 2

    const totalPoints = multiplied

    await pool.query(`
      INSERT INTO "PredictionPoints" (id, "predictionId", "resultPoints", "topScorerPoints", "totalPoints", explanation)
      VALUES ($5, $1, $2, 0, $3, $4)
      ON CONFLICT ("predictionId") DO UPDATE
        SET "resultPoints" = EXCLUDED."resultPoints",
            "totalPoints" = EXCLUDED."totalPoints",
            explanation = EXCLUDED.explanation
    `, [p.id, basePoints, totalPoints, explanation, cuid()])

    const label = `${ph}:${pa}${p.x3Applied ? ' [X3]' : p.x2Applied ? ' [X2]' : p.goalsApplied ? ' [GOALS+]' : p.splitApplied ? ' [SPLIT]' : ''}`
    console.log(`  ${p.username.padEnd(20)} ניחש ${label} → ${basePoints} בסיס → ${totalPoints} סה"כ`)
  }

  console.log('\nDone! Run sim-no-x3 to see updated standings.')
  await pool.end()
}
main().catch(console.error)
