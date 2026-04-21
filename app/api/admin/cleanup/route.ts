import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Deletes past/finished matches from laliga-2025-2026 tournament that predate today's English matches
export async function GET() {
  return POST()
}

export async function POST() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const deleted = await db.match.deleteMany({
    where: {
      tournament: { slug: 'laliga-2025-2026' },
      kickoffAt: { lt: today },
      predictions: { none: {} },
    },
  })

  return NextResponse.json({ deleted: deleted.count })
}
