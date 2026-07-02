import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

export async function POST(request: Request) {
  const { secret, slug, isActive } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const result = await db.tournament.updateMany({
    where: { slug },
    data: { isActive },
  })

  return NextResponse.json({ ok: true, updated: result.count })
}
