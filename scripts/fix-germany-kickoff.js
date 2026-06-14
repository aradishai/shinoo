const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m."kickoffAt", m."lockAt", ht."nameHe" as home, at."nameHe" as away
      FROM "Match" m
      JOIN "Team" ht ON m."homeTeamId" = ht.id
      JOIN "Team" at ON m."awayTeamId" = at.id
      WHERE (ht.code = 'GER' OR at.code = 'GER')
        AND (ht.code = 'CUW' OR at.code = 'CUW')
    `)

    const match = rows[0]
    console.log('Match:', match.home, 'vs', match.away)
    console.log('Current kickoffAt:', match.kickoffAt.toISOString())
    console.log('Current lockAt:', match.lockAt.toISOString())

    // kickoffAt back to T14:00Z (displays as 20:00 in the app)
    // lockAt to T13:00Z (displays as 19:00 = 1 hour before kickoff)
    await pool.query(
      `UPDATE "Match" SET "kickoffAt" = '2026-06-14T14:00:00.000Z', "lockAt" = '2026-06-14T13:00:00.000Z' WHERE id = $1`,
      [match.id]
    )

    console.log('Fixed: kickoffAt → T14:00Z (shows 20:00), lockAt → T13:00Z (shows 19:00)')
  } finally {
    await pool.end()
  }
}

main().catch(console.error)
