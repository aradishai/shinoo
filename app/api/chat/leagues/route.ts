import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const memberships = await db.leagueMember.findMany({
    where: { userId },
    include: {
      league: {
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { user: { select: { username: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const leagues = memberships.map(m => ({
    id: m.league.id,
    name: m.league.name,
    lastMessage: m.league.messages[0] ?? null,
  }))

  return NextResponse.json({ leagues, currentUserId: userId })
}
