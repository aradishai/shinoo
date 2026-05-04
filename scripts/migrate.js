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
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 8`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "x2Stock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "shinooStock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "x3Stock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "goalsStock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "minute90Stock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "splitStock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "x3Applied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "goalsApplied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "minute90Applied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "splitApplied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "splitHomeScore2" INTEGER`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "splitAwayScore2" INTEGER`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "CoinBet" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "predictionId" TEXT NOT NULL,
        "betAmount" INTEGER NOT NULL,
        "coinsEarned" INTEGER,
        "resolvedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CoinBet_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CoinBet_predictionId_key" UNIQUE ("predictionId")
      )
    `)
    await pool.query(`DROP TABLE IF EXISTS "PushSubscription"`)
    await pool.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "notifyTournamentIds"`)
    console.log('Column check complete')
  } finally {
    await pool.end()
  }
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1) })
