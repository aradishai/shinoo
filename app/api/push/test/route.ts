import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const subs = await db.pushSubscription.findMany({ where: { userId } })

  return NextResponse.json({
    userId,
    subscriptionCount: subs.length,
    vapidPublicSet: !!process.env.VAPID_PUBLIC_KEY,
    vapidPrivateSet: !!process.env.VAPID_PRIVATE_KEY,
    subs: subs.map(s => ({ id: s.id, endpoint: s.endpoint.slice(0, 60) + '...' })),
  })
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  }

  webpush.setVapidDetails('mailto:aradishai10@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

  const subs = await db.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return NextResponse.json({ error: 'אין subscriptions למשתמש זה' })

  const results = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '✅ בדיקת התראות', body: 'אם ראית את זה - עובד!', url: '/chat' })
      )
      results.push({ endpoint: sub.endpoint.slice(0, 40), status: 'sent' })
    } catch (err: unknown) {
      results.push({ endpoint: sub.endpoint.slice(0, 40), status: 'failed', error: String(err) })
      await db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
    }
  }

  return NextResponse.json({ results })
}
