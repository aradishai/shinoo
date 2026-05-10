import { db } from '../lib/db'

async function main() {
  const user = await db.user.findFirst({ where: { username: { contains: 'ערד' } }, select: { id: true, coins: true, username: true } })
  if (!user) { console.log('not found'); await db.$disconnect(); return }
  console.log(`${user.username}: ${user.coins} coins`)
  
  const grants = await db.powerupUsage.findMany({ where: { userId: user.id } })
  console.log(`\nPowerupUsage (${grants.length}):`)
  for (const g of grants) {
    console.log(`  type:${g.type} matchday:${g.matchday} leagueId:${g.leagueId} createdAt:${g.createdAt}`)
  }
  
  await db.$disconnect()
}
main()
