import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tournaments = await db.tournament.findMany({
    where: { isActive: true },
    select: { id: true, nameHe: true },
    orderBy: { id: 'asc' },
  })
  return NextResponse.json({ data: tournaments })
}
