import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { db } from '@/lib/db'

// Called by an external cron job every hour
// cron-job.org → POST https://shinoo-production-7ab8.up.railway.app/api/push/notify
// Header: Authorization: Bearer shinoo-cron-2026
export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET || 'shinoo-cron-2026'}`
  if (auth !== expected) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 })

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@shinoo.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const now = new Date()
  const windowStart = new Date(now.getTime() + 60 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 120 * 60 * 1000)

  const upcomingMatches = await db.match.findMany({
    where: { status: 'SCHEDULED', kickoffAt: { gte: windowStart, lte: windowEnd } },
    include: {
      homeTeam: { select: { nameHe: true } },
      awayTeam: { select: { nameHe: true } },
    },
  })

  if (upcomingMatches.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const match of upcomingMatches) {
    const predictions = await db.prediction.findMany({
      where: { matchId: match.id },
      select: { userId: true },
    })
    const predictedUserIds = new Set(predictions.map(p => p.userId))

    const leagueMembers = await db.leagueMember.findMany({ select: { userId: true } })
    const notifyUserIds = leagueMembers
      .map(m => m.userId)
      .filter((uid, idx, arr) => arr.indexOf(uid) === idx)
      .filter(uid => !predictedUserIds.has(uid))

    if (notifyUserIds.length === 0) continue

    const users = await db.user.findMany({
      where: { id: { in: notifyUserIds } },
      select: { id: true, notifyTournamentIds: true },
    })
    const eligibleUserIds = users
      .filter(u => u.notifyTournamentIds.length === 0 || u.notifyTournamentIds.includes(match.tournamentId))
      .map(u => u.id)

    if (eligibleUserIds.length === 0) continue

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId: { in: eligibleUserIds } },
    })

    const payload = JSON.stringify({
      title: 'SHINOO ⚽',
      body: `${match.homeTeam.nameHe} נגד ${match.awayTeam.nameHe} מתחיל בעוד שעה — עוד לא ניחשת!`,
      url: '/',
    })

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch {
        await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ sent, matches: upcomingMatches.length })
}
