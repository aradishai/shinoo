const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query(`
  SELECT ht."nameHe" as home, at."nameHe" as away, m.status, m."kickoffAt", m."lockAt", m."providerMatchId"
  FROM "Match" m
  JOIN "Team" ht ON m."homeTeamId" = ht.id
  JOIN "Team" at ON m."awayTeamId" = at.id
  WHERE m.status = 'LOCKED'
`).then(r => {
  r.rows.forEach(x => console.log(x))
  console.log('Now:', new Date().toISOString())
  pool.end()
}).catch(e => { console.error(e.message); pool.end() })
