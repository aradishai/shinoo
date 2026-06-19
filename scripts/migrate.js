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
    await pool.query(`ALTER TABLE "User" DROP COLUMN IF EXISTS "notifyTournamentIds"`)
    await pool.query(`UPDATE "Team" SET code = 'ESP-NT' WHERE code = 'ESP' AND "nameEn" = 'Spain' AND NOT EXISTS (SELECT 1 FROM "Team" WHERE code = 'ESP-NT')`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "interests" TEXT[] NOT NULL DEFAULT '{}'`)
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "minuteAt" TIMESTAMP(3)`)
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "coinsGranted" BOOLEAN NOT NULL DEFAULT false`)
    // Prevent retroactive coin grants only for matches older than 48h (recent ones still get distributed by sync)
    await pool.query(`UPDATE "Match" SET "coinsGranted" = true WHERE status = 'FINISHED' AND "coinsGranted" = false AND "kickoffAt" < NOW() - INTERVAL '48 hours'`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL,
        "leagueId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Message_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE,
        CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS "Message_leagueId_createdAt_idx" ON "Message"("leagueId", "createdAt")`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "endpoint" TEXT NOT NULL,
        "p256dh" TEXT NOT NULL,
        "auth" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint"),
        CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `)
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "reminderSent" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT NOT NULL DEFAULT '⚽'`)
    await pool.query(`ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "summarySent" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allinStock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "allinApplied" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AllInPool" (
        "id" TEXT NOT NULL,
        "matchId" TEXT NOT NULL,
        "leagueId" TEXT NOT NULL,
        "resolved" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AllInPool_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "AllInPool_matchId_leagueId_key" UNIQUE ("matchId", "leagueId")
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "AllInEntry" (
        "id" TEXT NOT NULL,
        "poolId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "predictionId" TEXT NOT NULL,
        "pointsWon" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AllInEntry_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "AllInEntry_predictionId_key" UNIQUE ("predictionId"),
        CONSTRAINT "AllInEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "AllInPool"("id")
      )
    `)
    await pool.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "doubleStock" INTEGER NOT NULL DEFAULT 0`)
    await pool.query(`ALTER TABLE "DoubleEntry" ADD COLUMN IF NOT EXISTS "chatSent" BOOLEAN NOT NULL DEFAULT false`)
    await pool.query(`CREATE TABLE IF NOT EXISTS "DoubleEntry" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "leagueId" TEXT NOT NULL,
      "predictionId1" TEXT,
      "predictionId2" TEXT,
      "bonusPoints" INTEGER,
      "resolved" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DoubleEntry_pkey" PRIMARY KEY ("id")
    )`)
    console.log('Column check complete')
  } finally {
    await pool.end()
  }
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1) })
