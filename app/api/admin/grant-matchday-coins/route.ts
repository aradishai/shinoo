import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SECRET = process.env.ADMIN_SECRET || 'shinoo-admin-2026'
const COINS_PER_MATCHDAY = 10

// Called manually or via cron at the start of each matchday
// POST { "secret": "...", "matchday": 35 } — grants coins to all users who haven't received them yet this matchday
export async function POST(request: Request) {
  const { secret, matchday } = await request.json()
  if (secret !== SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!matchday || typeof matchday !== 'number')
    return NextResponse.json({ error: 'matchday number required' }, { status: 400 })

  // Find all users who already got coins this matchday
  const alreadyGranted = await db.powerupUsage.findMany({
    where: { type: `coins_matchday_${matchday}` },
    select: { userId: true },
  })
  const alreadyGrantedIds = new Set(alreadyGranted.map(r => r.userId))

  const allUsers = await db.user.findMany({ select: { id: true } })
  const toGrant = allUsers.filter(u => !alreadyGrantedIds.has(u.id))

  for (const user of toGrant) {
    await db.user.update({ where: { id: user.id }, data: { coins: { increment: COINS_PER_MATCHDAY } } })
    await db.powerupUsage.create({
      data: { userId: user.id, leagueId: 'global', matchday, type: `coins_matchday_${matchday}` },
    })
  }

  return NextResponse.json({ granted: toGrant.length, skipped: alreadyGrantedIds.size, coinsPerUser: COINS_PER_MATCHDAY })
}
