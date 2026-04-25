const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User'`
    )
    if (rows[0].count === '0') {
      console.log('Running initial migration...')
      const sql = fs.readFileSync(
        path.join(__dirname, '../prisma/migrations/20260419000000_init/migration.sql'),
        'utf8'
      )
      await pool.query(sql)
      console.log('Migration complete')
    } else {
      console.log('Tables already exist, skipping migration')
    }
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "minute" INTEGER`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "x2Applied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "shinooApplied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "PowerupUsage" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "leagueId" TEXT NOT NULL,
        "matchday" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PowerupUsage_pkey" PRIMARY KEY ("id")
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS "PowerupUsage_userId_leagueId_matchday_type_idx" ON "PowerupUsage"("userId", "leagueId", "matchday", "type")`)
    console.log('Column check complete')
  } finally {
    await pool.end()
  }
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1) })
