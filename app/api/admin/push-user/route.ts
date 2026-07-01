import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import webpush from 'web-push'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:aradishai10@gmail.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
}

export async function POST(request: Request) {
  const { secret, username, title, body, url } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await db.user.findFirst({ where: { username } })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const subs = await db.pushSubscription.findMany({ where: { userId: user.id } })
  if (subs.length === 0) return NextResponse.json({ error: 'אין מנויי push למשתמש' }, { status: 404 })

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url: url || '/' })
      )
      sent++
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
