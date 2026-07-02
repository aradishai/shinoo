import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tournaments = await db.tournament.findMany({
    orderBy: { id: 'desc' },
    select: { id: true, nameHe: true, slug: true, isActive: true },
  })
  return NextResponse.json({ data: tournaments })
}
