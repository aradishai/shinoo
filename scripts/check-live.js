const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const now = new Date().toISOString()
  console.log('Now:', now)

  const { rows } = await pool.query(`
    SELECT m.id, m.status, m."kickoffAt", m."lockAt", m."homeScore", m."awayScore", m."providerMatchId",
           ht."nameHe" as home, at."nameHe" as away
    FROM "Match" m
    JOIN "Team" ht ON m."homeTeamId" = ht.id
    JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE m.status IN ('LOCKED','LIVE','PAUSED')
       OR (m.status = 'SCHEDULED' AND m."kickoffAt" < NOW() + INTERVAL '3 hours')
    ORDER BY m."kickoffAt" DESC
    LIMIT 15
  `)

  for (const r of rows) {
    console.log(`[${r.status}] ${r.home} vs ${r.away} | kickoff: ${r.kickoffAt} | lock: ${r.lockAt} | score: ${r.homeScore}:${r.awayScore} | provider: ${r.providerMatchId}`)
  }

  await pool.end()
}
main().catch(console.error)
