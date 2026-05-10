import { db } from '../lib/db'

async function main() {
  const user = await db.user.findFirst({ where: { username: { contains: 'ערד' } }, select: { id: true, username: true } })
  if (!user) { console.log('not found'); await db.$disconnect(); return }
  console.log(`Found: ${user.username} (${user.id})`)

  await db.$executeRaw`
    UPDATE "User"
    SET coins = 4,
        "x2Stock" = 0,
        "shinooStock" = 0,
        "x3Stock" = 0,
        "goalsStock" = 0,
        "minute90Stock" = 0,
        "splitStock" = 0
    WHERE id = ${user.id}
  `

  const result: any[] = await db.$queryRaw`
    SELECT coins, "x2Stock", "shinooStock", "x3Stock", "goalsStock", "minute90Stock", "splitStock"
    FROM "User" WHERE id = ${user.id}
  `
  console.log('Updated:', result[0])
  await db.$disconnect()
}
main()
