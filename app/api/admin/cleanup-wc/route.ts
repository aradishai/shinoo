import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  }

  // Delete all June 2026+ matches without providerMatchId (old sync duplicates)
  // First check how many
  const before = await db.match.count({
    where: { kickoffAt: { gte: new Date('2026-06-01') }, providerMatchId: null },
  })

  const deleted = await db.match.deleteMany({
    where: { kickoffAt: { gte: new Date('2026-06-01') }, providerMatchId: null },
  })

  // Fix Hebrew team names
  const teamFixes = [
    { codes: ['BIH'], nameHe: 'בוסניה והרצגובינה' },
    { codes: ['CPV'], nameHe: 'קייפ ורד' },
    { codes: ['COD'], nameHe: 'קונגו DR' },
    { codes: ['CUW', 'CUR'], nameHe: 'קוראסאו' },
    { codes: ['HAI', 'HTI'], nameHe: 'האיטי' },
    { codes: ['NZL'], nameHe: 'ניו זילנד' },
    { codes: ['KSA', 'SAU'], nameHe: 'ערב הסעודית' },
    { codes: ['URY', 'URU'], nameHe: 'אורוגוואי' },
  ]

  let teamsFixed = 0
  for (const { codes, nameHe } of teamFixes) {
    const r = await db.team.updateMany({
      where: { code: { in: codes } },
      data: { nameHe },
    })
    teamsFixed += r.count
  }

  const total = await db.match.count()

  return NextResponse.json({ ok: true, before, deleted: deleted.count, total, teamsFixed })
}
