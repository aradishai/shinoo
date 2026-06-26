const { Pool } = require('pg')
const { randomBytes } = require('crypto')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const MATCH_ID = 'cmobmm59v003x12r2hrjztnwo'
const LEAGUE_ID = 'cmo7p04ly000001oc97z3uwbs'
const SOLOKILLER_ID = 'cmpsltx6i0fjj01p4vf2ruzzt'
const OM_ARAD_ID = 'cmqidq8zp074001o7ogw4jiix'

function cuid() {
  return 'c' + randomBytes(11).toString('hex').slice(0, 24)
}

async function main() {
  const now = new Date().toISOString()

  // Solokiller: 2:1
  await pool.query(`
    INSERT INTO "Prediction" (id, "userId", "leagueId", "matchId", "predictedHomeScore", "predictedAwayScore", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    ON CONFLICT ("userId", "leagueId", "matchId") DO UPDATE
      SET "predictedHomeScore" = EXCLUDED."predictedHomeScore",
          "predictedAwayScore" = EXCLUDED."predictedAwayScore",
          "updatedAt" = EXCLUDED."updatedAt"
  `, [cuid(), SOLOKILLER_ID, LEAGUE_ID, MATCH_ID, 2, 1, now])
  console.log('✓ Solokiller: 2:1')

  // אום ערד: 3:1
  await pool.query(`
    INSERT INTO "Prediction" (id, "userId", "leagueId", "matchId", "predictedHomeScore", "predictedAwayScore", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
    ON CONFLICT ("userId", "leagueId", "matchId") DO UPDATE
      SET "predictedHomeScore" = EXCLUDED."predictedHomeScore",
          "predictedAwayScore" = EXCLUDED."predictedAwayScore",
          "updatedAt" = EXCLUDED."updatedAt"
  `, [cuid(), OM_ARAD_ID, LEAGUE_ID, MATCH_ID, 3, 1, now])
  console.log('✓ אום ערד: 3:1')

  // Verify
  const check = await pool.query(`
    SELECT u.username, p."predictedHomeScore", p."predictedAwayScore"
    FROM "Prediction" p JOIN "User" u ON p."userId" = u.id
    WHERE p."matchId" = $1 AND p."userId" IN ($2, $3)
  `, [MATCH_ID, SOLOKILLER_ID, OM_ARAD_ID])
  console.log('Verified:', JSON.stringify(check.rows, null, 2))

  await pool.end()
}
main().catch(console.error)
