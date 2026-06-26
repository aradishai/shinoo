const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const ARAD_ID = 'cmo7ofm8x005d12qnkcagnotn'

pool.query(
  'UPDATE "User" SET coins = coins + 5 WHERE id = $1 AND username = $2 RETURNING username, coins',
  [ARAD_ID, 'ערד']
).then(r => {
  if (r.rows.length === 0) { console.error('ERROR: no match — nothing updated!'); }
  else { console.log('Updated:', JSON.stringify(r.rows[0])) }
  pool.end()
}).catch(e => { console.error(e.message); pool.end() })
