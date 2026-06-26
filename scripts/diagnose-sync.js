const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const staleTime = new Date(Date.now() - 115 * 60 * 1000)
  console.log('Now:', new Date().toISOString())
  console.log('Stale threshold (115min ago):', staleTime.toISOString())

  const { rows } = await pool.query(`
    SELECT id, status, "kickoffAt"
    FROM "Match"
    WHERE status IN ('LIVE', 'PAUSED', 'LOCKED')
      AND "kickoffAt" <= $1
  `, [staleTime])

  console.log('\nStale matches found:', rows.length)
  rows.forEach(r => console.log(' ', r.status, r.kickoffAt.toISOString(), r.id))

  // Also check what the lifecycle sees for LOCKED matches
  const { rows: locked } = await pool.query(`SELECT id, status, "kickoffAt", "lockAt" FROM "Match" WHERE status = 'LOCKED'`)
  console.log('\nAll LOCKED matches:', locked.length)
  locked.forEach(r => console.log(' ', r.kickoffAt.toISOString(), r.id))

  pool.end()
}

main().catch(e => { console.error(e); pool.end() })
