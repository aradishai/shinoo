import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const matches = await db.match.findMany({
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      scorers: { include: { player: true } },
    },
    orderBy: { kickoffAt: 'asc' },
  })
  return NextResponse.json({ data: matches })
}
