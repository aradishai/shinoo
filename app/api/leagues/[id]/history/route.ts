import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const membership = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!membership) return NextResponse.json({ error: 'אינך חבר בליגה זו' }, { status: 403 })

  const predictions = await db.prediction.findMany({
    where: { userId, leagueId: params.id, match: { status: 'FINISHED' } },
    include: {
      match: {
        include: {
          homeTeam: { select: { nameHe: true, code: true, flagUrl: true } },
          awayTeam: { select: { nameHe: true, code: true, flagUrl: true } },
        },
      },
      points: true,
    },
    orderBy: { match: { kickoffAt: 'desc' } },
  })

  return NextResponse.json({ data: predictions })
}
