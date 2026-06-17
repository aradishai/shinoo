import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const url = new URL(req.url)
  const leagueId = url.searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'חסר leagueId' }, { status: 400 })

  const pool = await db.allInPool.findUnique({
    where: { matchId_leagueId: { matchId: params.id, leagueId } },
    include: {
      entries: {
        include: {
          pool: false,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!pool) return NextResponse.json({ pool: null })

  // Get usernames and points for each entry
  const enriched = await Promise.all(
    pool.entries.map(async (entry) => {
      const user = await db.user.findUnique({ where: { id: entry.userId }, select: { username: true } })
      const points = await db.predictionPoints.findUnique({
        where: { predictionId: entry.predictionId },
        select: { totalPoints: true },
      })
      return {
        userId: entry.userId,
        username: user?.username ?? '?',
        pointsWon: entry.pointsWon,
        currentPoints: points?.totalPoints ?? null,
        isMe: entry.userId === userId,
      }
    })
  )

  const resolved = pool.resolved
  const totalPot = resolved
    ? enriched.reduce((s, e) => s + (e.pointsWon ?? 0), 0)
    : enriched.reduce((s, e) => s + (e.currentPoints ?? 0), 0)

  return NextResponse.json({
    pool: {
      id: pool.id,
      resolved,
      totalPot,
      entries: enriched,
    },
  })
}
