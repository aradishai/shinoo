CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Tournament" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameHe" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'world_cup',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "season" TEXT NOT NULL,
  CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "nameHe" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "flagUrl" TEXT,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

CREATE TABLE "Player" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "nameHe" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Match" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "homeTeamId" TEXT NOT NULL,
  "awayTeamId" TEXT NOT NULL,
  "kickoffAt" TIMESTAMP(3) NOT NULL,
  "lockAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "providerMatchId" TEXT,
  "round" TEXT,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Match_providerMatchId_key" ON "Match"("providerMatchId");

CREATE TABLE "MatchScorer" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "goals" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "MatchScorer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MatchScorer_matchId_playerId_key" ON "MatchScorer"("matchId", "playerId");

CREATE TABLE "League" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tournamentId" TEXT,
  CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "League_inviteCode_key" ON "League"("inviteCode");

CREATE TABLE "LeagueMember" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeagueMember_leagueId_userId_key" ON "LeagueMember"("leagueId", "userId");

CREATE TABLE "Prediction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "predictedHomeScore" INTEGER NOT NULL,
  "predictedAwayScore" INTEGER NOT NULL,
  "predictedTopScorerPlayerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedSnapshot" TEXT,
  CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Prediction_userId_leagueId_matchId_key" ON "Prediction"("userId", "leagueId", "matchId");

CREATE TABLE "PredictionPoints" (
  "id" TEXT NOT NULL,
  "predictionId" TEXT NOT NULL,
  "resultPoints" INTEGER NOT NULL DEFAULT 0,
  "topScorerPoints" INTEGER NOT NULL DEFAULT 0,
  "totalPoints" INTEGER NOT NULL DEFAULT 0,
  "explanation" TEXT,
  CONSTRAINT "PredictionPoints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PredictionPoints_predictionId_key" ON "PredictionPoints"("predictionId");

ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchScorer" ADD CONSTRAINT "MatchScorer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchScorer" ADD CONSTRAINT "MatchScorer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "League" ADD CONSTRAINT "League_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_predictedTopScorerPlayerId_fkey" FOREIGN KEY ("predictedTopScorerPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PredictionPoints" ADD CONSTRAINT "PredictionPoints_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
