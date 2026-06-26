const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // Find teams
  const teams = await pool.query(`
    SELECT id, code, "nameHe", "nameEn" FROM "Team"
    WHERE "nameHe" ILIKE '%ספרד%' OR "nameHe" ILIKE '%סעוד%'
       OR "nameEn" ILIKE '%spain%' OR "nameEn" ILIKE '%saudi%'
       OR code ILIKE '%ESP%' OR code ILIKE '%KSA%' OR code ILIKE '%SAU%'
  `)
  console.log('Teams:', JSON.stringify(teams.rows, null, 2))

  // Find match between them
  if (teams.rows.length >= 2) {
    const ids = teams.rows.map(t => `'${t.id}'`).join(',')
    const match = await pool.query(`
      SELECT m.id, m."homeScore", m."awayScore", m.status, m."providerMatchId",
             ht.code as home, ht."nameHe" as homeHe, at.code as away, at."nameHe" as awayHe
      FROM "Match" m
      JOIN "Team" ht ON m."homeTeamId" = ht.id
      JOIN "Team" at ON m."awayTeamId" = at.id
      WHERE m."homeTeamId" IN (${ids}) AND m."awayTeamId" IN (${ids})
    `)
    console.log('Match:', JSON.stringify(match.rows, null, 2))
  }

  await pool.end()
}
main().catch(e => { console.error(e.message); pool.end() })
