const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../dev.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Tournament" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameHe" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL DEFAULT 'world_cup',
  "isActive" INTEGER NOT NULL DEFAULT 1,
  "season" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Team" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nameHe" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "flagUrl" TEXT
);

CREATE TABLE IF NOT EXISTS "Player" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "teamId" TEXT NOT NULL,
  "nameHe" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
);

CREATE TABLE IF NOT EXISTS "Match" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tournamentId" TEXT NOT NULL,
  "homeTeamId" TEXT NOT NULL,
  "awayTeamId" TEXT NOT NULL,
  "kickoffAt" DATETIME NOT NULL,
  "lockAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "providerMatchId" TEXT UNIQUE,
  "round" TEXT,
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id"),
  FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id"),
  FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id")
);

CREATE TABLE IF NOT EXISTS "MatchScorer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "goals" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("matchId") REFERENCES "Match"("id"),
  FOREIGN KEY ("playerId") REFERENCES "Player"("id"),
  UNIQUE ("matchId", "playerId")
);

CREATE TABLE IF NOT EXISTS "League" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT,
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "LeagueMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  FOREIGN KEY ("leagueId") REFERENCES "League"("id"),
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  UNIQUE ("leagueId", "userId")
);

CREATE TABLE IF NOT EXISTS "Prediction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "predictedHomeScore" INTEGER NOT NULL,
  "predictedAwayScore" INTEGER NOT NULL,
  "predictedTopScorerPlayerId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedSnapshot" TEXT,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("leagueId") REFERENCES "League"("id"),
  FOREIGN KEY ("matchId") REFERENCES "Match"("id"),
  UNIQUE ("userId", "leagueId", "matchId")
);

CREATE TABLE IF NOT EXISTS "PredictionPoints" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "predictionId" TEXT NOT NULL UNIQUE,
  "resultPoints" INTEGER NOT NULL DEFAULT 0,
  "topScorerPoints" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  "explanation" TEXT,
  FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id")
);

CREATE TABLE IF NOT EXISTS "PowerupUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "matchday" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PowerupUsage_userId_leagueId_matchday_type" ON "PowerupUsage"("userId", "leagueId", "matchday", "type");

CREATE TABLE IF NOT EXISTS "CoinBet" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "predictionId" TEXT NOT NULL UNIQUE,
  "betAmount" INTEGER NOT NULL,
  "coinsEarned" INTEGER,
  "resolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id"),
  FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id")
);

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
`)

// Add new columns to existing tables (safe — silently ignores if already present)
const alterStatements = [
  `ALTER TABLE "Prediction" ADD COLUMN "x2Applied" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Prediction" ADD COLUMN "shinooApplied" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "Match" ADD COLUMN "minute" INTEGER`,
  `ALTER TABLE "User" ADD COLUMN "coins" INTEGER NOT NULL DEFAULT 5`,
]
for (const sql of alterStatements) {
  try { db.exec(sql) } catch (_) { /* column already exists */ }
}

console.log('✅ Database tables created/updated successfully')
db.close()
