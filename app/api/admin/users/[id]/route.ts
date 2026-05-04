import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const ADMIN_USERNAMES = ['ערד']

async function requireAdmin() {
  const token = cookies().get('shinu_token')?.value
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.userId) return null
    const user = await db.user.findUnique({ where: { id: payload.userId }, select: { username: true } })
    return user && ADMIN_USERNAMES.includes(user.username) ? user : null
  } catch { return null }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const target = await db.user.findUnique({ where: { id: params.id }, select: { username: true } })
  if (!target) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if (ADMIN_USERNAMES.includes(target.username))
    return NextResponse.json({ error: 'לא ניתן למחוק אדמין' }, { status: 400 })

  // מחיקת ליגות שהמשתמש יצר (כולל ניחושים וחברים בהן)
  const ownedLeagues = await db.league.findMany({
    where: { createdByUserId: params.id },
    select: { id: true },
  })
  const ownedLeagueIds = ownedLeagues.map(l => l.id)

  if (ownedLeagueIds.length > 0) {
    await db.prediction.deleteMany({ where: { leagueId: { in: ownedLeagueIds } } })
    await db.leagueMember.deleteMany({ where: { leagueId: { in: ownedLeagueIds } } })
    await db.league.deleteMany({ where: { id: { in: ownedLeagueIds } } })
  }

  // מחיקת כל שאר הרשומות של המשתמש
  await db.prediction.deleteMany({ where: { userId: params.id } })
  await db.leagueMember.deleteMany({ where: { userId: params.id } })
  await db.pushSubscription.deleteMany({ where: { userId: params.id } })
  await db.coinBet.deleteMany({ where: { userId: params.id } })

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
