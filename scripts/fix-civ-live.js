const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // Try direct update
  const result = await pool.query(`
    UPDATE "Match" SET status = 'LIVE'
    WHERE id = 'cmobmm5a9004212r2l5rjs5i8'
    RETURNING id, status, "kickoffAt"
  `)
  console.log('Updated:', result.rows[0])
  pool.end()
}

main().catch(e => { console.error(e); pool.end() })
