import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const SECRET = process.env.ADMIN_SECRET

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const staleTime = new Date(Date.now() - 115 * 60 * 1000)
  const staleMatches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED', 'LOCKED'] }, kickoffAt: { lte: staleTime } },
    select: { id: true, status: true, kickoffAt: true },
  })

  if (staleMatches.length === 0) {
    return NextResponse.json({ fixed: 0, matches: [] })
  }

  await db.match.updateMany({
    where: { id: { in: staleMatches.map(m => m.id) } },
    data: { status: 'FINISHED' },
  })

  return NextResponse.json({
    fixed: staleMatches.length,
    matches: staleMatches.map(m => ({ id: m.id, status: m.status, kickoffAt: m.kickoffAt })),
  })
}
