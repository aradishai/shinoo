const { Pool } = require('pg')
const { randomBytes } = require('crypto')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
function cuid() { return 'c' + randomBytes(11).toString('hex').slice(0, 24) }

const LEAGUE_ID = 'cmo7p04ly000001oc97z3uwbs'

async function main() {
  const { rows } = await pool.query(`SELECT id FROM "User" WHERE username = 'ערד' LIMIT 1`)
  const adminId = rows[0]?.id

  const content = `🏆 חידוש — פליאוף עליון ופליאוף תחתון!

הטבלה מחולקת עכשיו לשני אזורים:

🥇 מקומות 1-6 — פליאוף עליון
🔴 מקומות 7-12 — פליאוף תחתון

מה זה אומר?
שחקני הפליאוף התחתון יכולים לקנות ולהפעיל את לחצן כפול 3 — שמשלש את הניקוד על משחק לפני שהוא מתחיל.

המחיר: 10 מטבעות

זה הנשק של הפליאוף התחתון להתחיל לטפס למעלה 👊`

  await pool.query(
    `INSERT INTO "Message" (id, "leagueId", "userId", content, "isSystem", "createdAt") VALUES ($1, $2, $3, $4, true, NOW())`,
    [cuid(), LEAGUE_ID, adminId, content]
  )
  console.log('✓ נשלח')
  await pool.end()
}
main().catch(console.error)
