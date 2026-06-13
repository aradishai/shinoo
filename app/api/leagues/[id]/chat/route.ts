import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

function initVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:aradishai10@gmail.com'
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv)
    return true
  }
  return false
}

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: object) {
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload)
    )
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode
    console.error(`webpush failed (${status}):`, String(err))
    // Only remove subscription if push service says it's expired/invalid
    if (status === 404 || status === 410) {
      await db.pushSubscription.delete({ where: { endpoint } }).catch(() => {})
    }
  }
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

  const vapidReady = initVapid()
  if (vapidReady) {
    const league = await db.league.findUnique({ where: { id: params.id }, select: { name: true } })
    const mentions = [...content.matchAll(/@(\w+)/g)].map((m: RegExpMatchArray) => m[1].toLowerCase())

    const allMembers = await db.leagueMember.findMany({
      where: { leagueId: params.id, userId: { not: userId } },
      include: { user: { include: { pushSubscriptions: true } } },
    })

    for (const m of allMembers) {
      const isMentioned = mentions.includes(m.user.username.toLowerCase())
      const title = isMentioned
        ? `${message.user.username} תייג אותך ב-${league?.name}`
        : `${league?.name} - הודעה חדשה`
      const body = `${isMentioned ? '' : message.user.username + ': '}${content.trim()}`

      for (const sub of m.user.pushSubscriptions) {
        sendPush(sub.endpoint, sub.p256dh, sub.auth, { title, body, url: '/chat' })
      }
    }
  }

  return NextResponse.json({ message })
}
