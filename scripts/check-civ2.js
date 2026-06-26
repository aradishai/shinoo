const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query(`
  SELECT ht."nameHe" as home, at."nameHe" as away, m.status, m."kickoffAt", m."providerMatchId", m."coinsGranted"
  FROM "Match" m
  JOIN "Team" ht ON m."homeTeamId" = ht.id
  JOIN "Team" at ON m."awayTeamId" = at.id
  WHERE ht.code = 'CIV' OR at.code = 'CIV'
  ORDER BY m."kickoffAt" DESC
`).then(r => {
  r.rows.forEach(x => console.log(x))
  pool.end()
}).catch(e => { console.error(e.message); pool.end() })
