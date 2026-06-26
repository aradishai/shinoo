const { Pool } = require('pg')
const axios = require('axios')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  // 1. Check current locked matches
  const { rows: locked } = await pool.query(`
    SELECT m.id, m.status, m."kickoffAt", m."providerMatchId",
           ht."nameEn" as home, at."nameEn" as away
    FROM "Match" m
    JOIN "Team" ht ON m."homeTeamId" = ht.id
    JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE m.status IN ('LOCKED','LIVE','PAUSED')
    ORDER BY m."kickoffAt" DESC
  `)
  console.log('=== LOCKED/LIVE matches in DB ===')
  locked.forEach(r => console.log(`[${r.status}] ${r.home} vs ${r.away} | kickoff: ${r.kickoffAt} | provider: ${r.providerMatchId}`))

  // 2. Try api-sports
  const AF_KEY = process.env.FOOTBALL_API_KEY
  console.log('\n=== API Key present:', !!AF_KEY, AF_KEY ? `(${AF_KEY.slice(0,8)}...)` : 'MISSING')

  if (!AF_KEY) { await pool.end(); return }

  const today = new Date().toISOString().slice(0, 10)
  console.log('\nFetching api-sports for date:', today)

  try {
    const res = await axios.get('https://v3.football.api-sports.io/fixtures', {
      params: { date: today, league: 1, season: 2026 },
      headers: { 'x-apisports-key': AF_KEY },
      timeout: 8000,
    })
    const fixtures = res.data?.response ?? []
    console.log(`Got ${fixtures.length} fixtures from api-sports`)

    for (const f of fixtures) {
      const status = f.fixture?.status?.short
      const home = f.teams?.home?.name
      const away = f.teams?.away?.name
      const score = `${f.goals?.home ?? '?'}:${f.goals?.away ?? '?'}`
      console.log(`  [${status}] ${home} vs ${away} | ${score}`)
    }
  } catch(e) {
    console.error('API call failed:', e.message)
  }

  await pool.end()
}
main().catch(console.error)
