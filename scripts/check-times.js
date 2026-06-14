const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query(`
  SELECT ht."nameHe" as home, at."nameHe" as away, m."kickoffAt", m."lockAt"
  FROM "Match" m
  JOIN "Team" ht ON m."homeTeamId" = ht.id
  JOIN "Team" at ON m."awayTeamId" = at.id
  WHERE m."kickoffAt" >= '2026-06-14' AND m."kickoffAt" < '2026-06-15'
  ORDER BY m."kickoffAt"
  LIMIT 10
`).then(r => {
  r.rows.forEach(x => console.log(x.home, 'vs', x.away, '| kick:', x.kickoffAt.toISOString(), '| lock:', x.lockAt.toISOString()))
  pool.end()
})
