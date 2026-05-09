import { db } from '../lib/db'

async function main() {
  const arad = await db.user.findFirst({ where: { username: 'ערד' } })
  if (!arad) { console.log('user not found'); return }
  console.log(`ערד coins: ${arad.coins}`)

  // Last 2 finished matches with Arad's predictions
  const preds = await db.prediction.findMany({
    where: { userId: arad.id },
    include: {
      points: true,
      match: { include: { homeTeam: true, awayTeam: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })

  for (const p of preds) {
    const m = p.match
    console.log(`\n[${m.status}] ${m.homeTeam.nameHe} vs ${m.awayTeam.nameHe} | actual: ${m.homeScore}-${m.awayScore}`)
    console.log(`  League: ${p.leagueId}`)
    console.log(`  Predicted: ${p.predictedHomeScore}-${p.predictedAwayScore}`)
    console.log(`  x2:${p.x2Applied} shinoo:${(p as any).shinooApplied} x3:${(p as any).x3Applied} goals:${(p as any).goalsApplied}`)
    console.log(`  Points: ${p.points?.totalPoints ?? 'NULL'} (explanation: ${p.points?.explanation ?? '-'})`)
    console.log(`  match.providerMatchId: ${m.providerMatchId}`)
  }

  await db.$disconnect()
}
main()
