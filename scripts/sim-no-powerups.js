const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function getOutcome(h, a) { return h > a ? 'home' : h < a ? 'away' : 'draw' }

function calcPoints(ph, pa, ah, aa) {
  const po = getOutcome(ph, pa), ao = getOutcome(ah, aa)
  if (ph === ah && pa === aa) return 5
  if (po !== ao) return 0
  if (ph === ah || pa === aa) return 3
  if (ao === 'draw') return 2
  return 1
}

async function main() {
  const LEAGUE_ID = 'cmo7p04ly000001oc97z3uwbs'

  // Get all members
  const members = await pool.query(`
    SELECT u.id, u.username FROM "LeagueMember" lm
    JOIN "User" u ON lm."userId" = u.id
    WHERE lm."leagueId" = $1
  `, [LEAGUE_ID])

  // Get all finished predictions with match results
  const preds = await pool.query(`
    SELECT p.*, pp."resultPoints", pp."totalPoints", pp."topScorerPoints",
           m."homeScore", m."awayScore", u.username
    FROM "Prediction" p
    JOIN "User" u ON p."userId" = u.id
    JOIN "Match" m ON p."matchId" = m.id
    LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
    WHERE p."leagueId" = $1 AND m.status = 'FINISHED' AND m."homeScore" IS NOT NULL
  `, [LEAGUE_ID])

  // Per user: sum current vs pure (no powerup)
  const userTotals = {}
  for (const m of members.rows) userTotals[m.username] = { current: 0, pure: 0, x3detail: [] }

  for (const p of preds.rows) {
    const u = p.username
    if (!userTotals[u]) continue

    const current = Number(p.totalPoints ?? 0)
    userTotals[u].current += current

    const ah = p.homeScore, aa = p.awayScore
    const ph = p.predictedHomeScore, pa = p.predictedAwayScore

    // Pure score: standard scoring, no multipliers, no GOALS+, no SPLIT bonus
    const pure = calcPoints(ph, pa, ah, aa)
    userTotals[u].pure += pure

    // Debug X3
    if (p.x3Applied) {
      userTotals[u].x3detail.push({ match: `${ah}:${aa}`, pred: `${ph}:${pa}`, base: p.resultPoints, total: current, pure })
    }
  }

  // Debug אבו-ערד
  console.log('\n=== X3 detail for אבו-ערד ===')
  for (const d of (userTotals['אבו-ערד']?.x3detail ?? [])) {
    console.log(`  תוצאה ${d.match}, ניחש ${d.pred} → base=${d.base}, עם X3=${d.total}, ללא X3=${d.pure}`)
  }

  // Sort by pure
  const sorted = Object.entries(userTotals).sort((a, b) => b[1].pure - a[1].pure)

  console.log('\n=== סימולציה ללא לחצנים ===')
  console.log(`${'שחקן'.padEnd(20)} | ${'נוכחי'.padStart(6)} | ${'ללא לחצנים'.padStart(10)} | הפרש`)
  console.log('-'.repeat(55))
  for (const [username, v] of sorted) {
    const diff = v.pure - v.current
    const diffStr = diff === 0 ? '—' : `${diff}`
    console.log(`${username.padEnd(20)} | ${String(v.current).padStart(6)} | ${String(v.pure).padStart(10)} | ${diffStr}`)
  }

  await pool.end()
}
main().catch(console.error)
