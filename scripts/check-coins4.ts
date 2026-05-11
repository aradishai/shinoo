import { db } from '../lib/db'

async function main() {
  const user = await db.user.findFirst({ where: { username: { contains: 'ערד' } }, select: { id: true, coins: true } })
  if (!user) { await db.$disconnect(); return }
  console.log(`coins: ${user.coins}`)

  const preds = await db.prediction.findMany({
    where: { userId: user.id },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { match: { kickoffAt: 'desc' } },
  })

  const byMatch: Record<string, any[]> = {}
  for (const p of preds) {
    if (!byMatch[p.matchId]) byMatch[p.matchId] = []
    byMatch[p.matchId].push(p)
  }

  console.log('\nRecent matches with predictions:')
  for (const [matchId, ps] of Object.entries(byMatch)) {
    const m = ps[0].match
    console.log(`  [${m.status}] ${m.homeTeam.nameHe} vs ${m.awayTeam.nameHe} | kickoff:${m.kickoffAt.toISOString().slice(0,16)} | leagues:${ps.length}`)
  }

  await db.$disconnect()
}
main()
