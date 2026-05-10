import { db } from '../lib/db'

async function main() {
  const user = await db.user.findFirst({
    where: { username: { contains: 'ערד' } },
    select: { id: true, username: true, coins: true },
  })
  if (!user) { console.log('user not found'); await db.$disconnect(); return }
  console.log(`User: ${user.username} | coins: ${user.coins}`)

  const totalPredictions = await db.prediction.count({ where: { userId: user.id } })
  console.log(`Total predictions: ${totalPredictions}`)

  const matchIds = await db.prediction.findMany({
    where: { userId: user.id, match: { status: 'FINISHED' } },
    select: { matchId: true },
    distinct: ['matchId'],
  })
  console.log(`Distinct FINISHED matches predicted: ${matchIds.length}`)

  const recentMatches = await db.match.findMany({
    where: { id: { in: matchIds.map(p => p.matchId) }, status: 'FINISHED' },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'desc' },
    take: 20,
  })
  console.log('\nRecent finished matches:')
  for (const m of recentMatches) {
    console.log(`  ${m.homeTeam.nameHe} vs ${m.awayTeam.nameHe} | ${m.kickoffAt.toISOString().slice(0,16)} | ${m.homeScore}-${m.awayScore}`)
  }

  await db.$disconnect()
}
main()
