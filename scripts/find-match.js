const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const matches = await pool.query(`
    SELECT m.id, m.status, m."kickoffAt", m."lockAt",
           ht."nameHe" as home, ht.code as homeCode,
           at."nameHe" as away, at.code as awayCode
    FROM "Match" m
    JOIN "Team" ht ON m."homeTeamId" = ht.id
    JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE ht.code IN ('USA','AUS') AND at.code IN ('USA','AUS')
  `)
  console.log('Matches:', JSON.stringify(matches.rows, null, 2))

  const users = await pool.query(`
    SELECT id, username FROM "User"
    WHERE username ILIKE '%solo%' OR username ILIKE 'אום%'
  `)
  console.log('Users:', JSON.stringify(users.rows, null, 2))

  await pool.end()
}
main().catch(console.error)
