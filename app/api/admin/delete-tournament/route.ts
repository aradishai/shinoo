import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Find matches by round name (e.g. "חצי גמר") — works even if tournament slug doesn't match
  const rows = await db.$queryRawUnsafe<{ id: string }[]>(`
    SELECT id FROM "Match" WHERE "round" = '${slug}'
  `)

  const matchIds = rows.map(r => r.id)
  if (matchIds.length === 0) return NextResponse.json({ error: 'no matches found', slug }, { status: 404 })

  const ids = matchIds.map(id => `'${id}'`).join(',')

  await db.$executeRawUnsafe(`DELETE FROM "PredictionPoints" WHERE "predictionId" IN (SELECT id FROM "Prediction" WHERE "matchId" IN (${ids}))`)
  await db.$executeRawUnsafe(`DELETE FROM "Prediction" WHERE "matchId" IN (${ids})`)
  await db.$executeRawUnsafe(`DELETE FROM "Match" WHERE id IN (${ids})`)

  return NextResponse.json({ ok: true, matchCount: matchIds.length })
}
