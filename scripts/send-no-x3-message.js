const { Pool } = require('pg')
const { randomBytes } = require('crypto')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
function cuid() { return 'c' + randomBytes(11).toString('hex').slice(0, 24) }

const LEAGUE_ID = 'cmo7p04ly000001oc97z3uwbs'

async function main() {
  const adminRes = await pool.query(`SELECT id, username FROM "User" WHERE username = 'ערד' LIMIT 1`)
  const adminId = adminRes.rows[0]?.id
  console.log('Sending as:', adminRes.rows[0]?.username)
  if (!adminId) { console.error('User not found'); await pool.end(); return }

  const content = `🤔 מה הייתה הטבלה בלי כפול 3?

1. ערד — 78
2. OzyB — 76
3. Tal Zidane — 75
4. Amitmerom — 69
5. נור — 62
5. גולס — 62
7. אבו-ערד — 59
8. OriX — 45
9. Solokiller — 40
10. אום ערד — 33
11. לוקה — 20
12. פושיק — 4

(הטבלה האמיתית כוללת X3 — זוהי סימולציה בלבד)`

  await pool.query(
    `INSERT INTO "Message" (id, "leagueId", "userId", content, "isSystem", "createdAt") VALUES ($1, $2, $3, $4, true, NOW())`,
    [cuid(), LEAGUE_ID, adminId, content]
  )
  console.log('✓ Message sent to הבאילנדוז')
  await pool.end()
}
main().catch(console.error)
