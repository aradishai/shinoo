const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query(`
  SELECT status, COUNT(*) as count
  FROM "Match"
  GROUP BY status
  ORDER BY count DESC
`).then(r => {
  console.log('Match statuses:')
  r.rows.forEach(x => console.log(' ', x.status, ':', x.count))
  pool.end()
}).catch(e => { console.error(e.message); pool.end() })
