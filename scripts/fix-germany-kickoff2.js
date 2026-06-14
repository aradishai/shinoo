const { Pool } = require('pg')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    // Current state: Germany is at T11:00Z (kick) and T10:00Z (lock)
    // App display offset is +6h, so T11:00Z shows as 17:00 (wrong)
    // Need T14:00Z to show 20:00, and T13:00Z to show 19:00 (1h before)
    // Adding 3 hours to both to get from current to target
    const { rows: before } = await pool.query(`
      SELECT m.id, m."kickoffAt", m."lockAt"
      FROM "Match" m
      JOIN "Team" ht ON m."homeTeamId" = ht.id
      JOIN "Team" at ON m."awayTeamId" = at.id
      WHERE (ht.code = 'GER' OR at.code = 'GER')
    `)
    const match = before[0]
    console.log('Before — kick:', match.kickoffAt.toISOString(), '| lock:', match.lockAt.toISOString())

    await pool.query(
      `UPDATE "Match"
       SET "kickoffAt" = "kickoffAt" + INTERVAL '3 hours',
           "lockAt"    = "lockAt"    + INTERVAL '3 hours'
       WHERE id = $1`,
      [match.id]
    )

    const { rows: after } = await pool.query(
      `SELECT "kickoffAt", "lockAt" FROM "Match" WHERE id = $1`,
      [match.id]
    )
    console.log('After  — kick:', after[0].kickoffAt.toISOString(), '| lock:', after[0].lockAt.toISOString())
    console.log('App should show: kick=20:00, lock=19:00')
  } finally {
    await pool.end()
  }
}

main().catch(console.error)
