const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { rows } = await pool.query(`
    SELECT
      l.name AS league,
      u.username,
      COALESCE(SUM(pp."totalPoints"), 0) AS current_total,
      COALESCE(SUM(pp."resultPoints" + pp."topScorerPoints"), 0) AS without_x3
    FROM "LeagueMember" lm
    JOIN "League" l ON lm."leagueId" = l.id
    JOIN "User" u ON lm."userId" = u.id
    LEFT JOIN "Prediction" p ON p."userId" = u.id AND p."leagueId" = l.id
    LEFT JOIN "PredictionPoints" pp ON pp."predictionId" = p.id
    WHERE l.name = 'הבאילנדוז'
    GROUP BY l.name, u.username
    ORDER BY current_total DESC
  `)

  let currentLeague = ''
  for (const row of rows) {
    if (row.league !== currentLeague) {
      currentLeague = row.league
      console.log(`\n=== ${currentLeague} ===`)
      console.log(`${'שחקן'.padEnd(20)} | ${'עם X3'.padStart(6)} | ${'ללא X3'.padStart(6)} | הפרש`)
      console.log('-'.repeat(50))
    }
    const diff = row.without_x3 - row.current_total
    const diffStr = diff === 0 ? '  —  ' : diff > 0 ? `+${diff}` : `${diff}`
    console.log(`${row.username.padEnd(20)} | ${String(row.current_total).padStart(6)} | ${String(row.without_x3).padStart(6)} | ${diffStr}`)
  }

  await pool.end()
}
main().catch(console.error)
