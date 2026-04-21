import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const deleted = await db.predictionPoints.deleteMany({})
  return NextResponse.json({ reset: true, deleted: deleted.count })
}
