const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const staleTime = new Date(Date.now() - 115 * 60 * 1000)
  console.log('staleTime:', staleTime.toISOString())

  // Simulate Prisma's updateMany
  const { rows } = await pool.query(`
    UPDATE "Match"
    SET status = 'FINISHED'
    WHERE status IN ('LIVE', 'PAUSED', 'LOCKED')
      AND "kickoffAt" <= $1
    RETURNING id, status
  `, [staleTime])

  console.log('Updated rows:', rows.length, rows)
  pool.end()
}

main().catch(e => { console.error(e); pool.end() })
