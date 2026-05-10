import { db } from '../lib/db'
async function main() {
  await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "coinsGranted" BOOLEAN NOT NULL DEFAULT false`
  // Mark all existing FINISHED matches as already granted
  await db.$executeRaw`UPDATE "Match" SET "coinsGranted" = true WHERE status = 'FINISHED'`
  console.log('Done.')
  await db.$disconnect()
}
main()
