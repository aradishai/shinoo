import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:aradishai10@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

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

  // Send push notifications to @mentioned users
  const mentions = [...content.matchAll(/@(\w+)/g)].map((m: RegExpMatchArray) => m[1].toLowerCase())
  if (mentions.length > 0 && process.env.VAPID_PUBLIC_KEY) {
    const league = await db.league.findUnique({ where: { id: params.id }, select: { name: true } })
    const mentionedUsers = await db.user.findMany({
      where: { username: { in: mentions, mode: 'insensitive' }, id: { not: userId } },
      include: { pushSubscriptions: true },
    })

    for (const user of mentionedUsers) {
      for (const sub of user.pushSubscriptions) {
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: `${message.user.username} תייג אותך ב-${league?.name}`,
            body: content.trim(),
            url: `/leagues/${params.id}?tab=chat`,
          })
        ).catch(() => {
          // Remove invalid subscription
          db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
        })
      }
    }
  }

  return NextResponse.json({ message })
}
