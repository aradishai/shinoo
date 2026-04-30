import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Get all matches for this tournament slug via raw SQL
  const rows = await db.$queryRawUnsafe<{ id: string }[]>(`
    SELECT m.id FROM "Match" m
    JOIN "Tournament" t ON t.id = m."tournamentId"
    WHERE t.slug = '${slug}'
  `)

  const matchIds = rows.map(r => r.id)

  if (matchIds.length === 0) {
    // Try to find and delete just the tournament record
    await db.$executeRawUnsafe(`DELETE FROM "Tournament" WHERE slug = '${slug}'`)
    return NextResponse.json({ ok: true, matchCount: 0 })
  }

  const ids = matchIds.map(id => `'${id}'`).join(',')

  await db.$executeRawUnsafe(`DELETE FROM "PredictionPoints" WHERE "predictionId" IN (SELECT id FROM "Prediction" WHERE "matchId" IN (${ids}))`)
  await db.$executeRawUnsafe(`DELETE FROM "Prediction" WHERE "matchId" IN (${ids})`)
  await db.$executeRawUnsafe(`DELETE FROM "Match" WHERE id IN (${ids})`)
  await db.$executeRawUnsafe(`DELETE FROM "Tournament" WHERE slug = '${slug}'`)

  return NextResponse.json({ ok: true, matchCount: matchIds.length })
}
