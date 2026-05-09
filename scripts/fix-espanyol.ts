import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter: new PrismaPg(pool) } as any)

async function main() {
  // 1. Create Espanyol club entry (separate from Spain NT)
  const espanyol = await db.team.upsert({
    where: { code: 'EPC' },
    update: { nameHe: 'אספניול', nameEn: 'Espanyol', flagUrl: 'https://crests.football-data.org/80.png' },
    create: { code: 'EPC', nameHe: 'אספניול', nameEn: 'Espanyol', flagUrl: 'https://crests.football-data.org/80.png' },
  })
  console.log('✅ Espanyol club entry:', espanyol.id)

  // 2. Fix La Liga matches — replace ESP-NT with EPC (Espanyol club)
  const laligaTournament = await db.tournament.findFirst({ where: { slug: { contains: 'la-liga' } } })
  if (!laligaTournament) { console.log('❌ La Liga tournament not found'); return }

  const espNT = await db.team.findUnique({ where: { code: 'ESP-NT' } })
  if (!espNT) { console.log('❌ ESP-NT not found'); return }

  const homeFixed = await db.$executeRaw`
    UPDATE "Match" SET "homeTeamId" = ${espanyol.id}
    WHERE "tournamentId" = ${laligaTournament.id} AND "homeTeamId" = ${espNT.id}
  `
  const awayFixed = await db.$executeRaw`
    UPDATE "Match" SET "awayTeamId" = ${espanyol.id}
    WHERE "tournamentId" = ${laligaTournament.id} AND "awayTeamId" = ${espNT.id}
  `
  console.log(`✅ Fixed ${homeFixed} home + ${awayFixed} away La Liga matches`)

  // 3. Fix ESP-NT flagUrl to actual Spain NT crest (not Espanyol club)
  await db.$executeRaw`UPDATE "Team" SET "flagUrl" = 'https://crests.football-data.org/760.png' WHERE code = 'ESP-NT'`
  console.log('✅ Fixed Spain NT flagUrl')

  await db.$disconnect(); await pool.end()
}
main()
