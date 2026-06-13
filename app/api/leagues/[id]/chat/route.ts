import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const member = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!member) return NextResponse.json({ error: 'לא חבר בליגה' }, { status: 403 })

  const messages = await db.message.findMany({
    where: { leagueId: params.id },
    include: { user: { select: { id: true, username: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({ messages })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const member = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!member) return NextResponse.json({ error: 'לא חבר בליגה' }, { status: 403 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'הודעה ריקה' }, { status: 400 })
  if (content.trim().length > 300) return NextResponse.json({ error: 'הודעה ארוכה מדי' }, { status: 400 })

  const message = await db.message.create({
    data: { leagueId: params.id, userId, content: content.trim() },
    include: { user: { select: { id: true, username: true } } },
  })

  return NextResponse.json({ message })
}
