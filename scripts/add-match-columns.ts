import { db } from '../lib/db'

async function main() {
  await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeRedCards" INTEGER NOT NULL DEFAULT 0`
  await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayRedCards" INTEGER NOT NULL DEFAULT 0`
  await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "hasPenalty" BOOLEAN NOT NULL DEFAULT false`
  console.log('Columns added.')
  await db.$disconnect()
}
main()
