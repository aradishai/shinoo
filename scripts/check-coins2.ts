import { db } from '../lib/db'

async function main() {
  const user = await db.user.findFirst({
    where: { username: { contains: 'ערד' } },
    select: { id: true, username: true, coins: true },
  })
  if (!user) { console.log('user not found'); await db.$disconnect(); return }
  console.log(`User: ${user.username} | coins: ${user.coins}`)

  // All predictions with match status
  const preds = await db.prediction.findMany({
    where: { userId: user.id },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { match: { kickoffAt: 'desc' } },
  })
  
  console.log(`\nAll ${preds.length} predictions:`)
  for (const p of preds) {
    const m = p.match
    console.log(`  [${m.status}] ${m.homeTeam.nameHe} vs ${m.awayTeam.nameHe} | kickoff:${m.kickoffAt.toISOString().slice(0,16)} | pred:${p.predictedHomeScore}-${p.predictedAwayScore} | actual:${m.homeScore}-${m.awayScore} | leagueId:${p.leagueId}`)
  }

  // All matches count by status
  const matchStatusGroups = preds.reduce((acc, p) => {
    const s = p.match.status
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {} as Record<string,number>)
  console.log('\nPrediction count by match status:', matchStatusGroups)

  await db.$disconnect()
}
main()
