import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { verifyPassword, hashPassword } from '@/lib/auth'

const ADMIN_USERNAMES = ['ערד']

function getUserId(): string | null {
  const token = cookies().get('shinu_token')?.value
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.userId ?? null
  } catch { return null }
}

export async function PUT(request: Request) {
  const userId = getUserId()
  if (!userId) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { type, newUsername, currentPassword, newPassword } = await request.json()

  if (type === 'username') {
    if (!newUsername?.trim()) return NextResponse.json({ error: 'שם משתמש לא תקין' }, { status: 400 })
    const existing = await db.user.findUnique({ where: { username: newUsername.trim() } })
    if (existing) return NextResponse.json({ error: 'שם משתמש תפוס' }, { status: 409 })
    await db.user.update({ where: { id: userId }, data: { username: newUsername.trim() } })
    return NextResponse.json({ ok: true })
  }

  if (type === 'password') {
    if (!currentPassword || !newPassword) return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
    if (newPassword.length < 4) return NextResponse.json({ error: 'סיסמה חייבת לפחות 4 תווים' }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } })
    if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'סיסמה נוכחית שגויה' }, { status: 401 })
    const newHash = await hashPassword(newPassword)
    await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'פעולה לא תקינה' }, { status: 400 })
}

export async function DELETE() {
  const userId = getUserId()
  if (!userId) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if (ADMIN_USERNAMES.includes(user.username)) return NextResponse.json({ error: 'לא ניתן למחוק אדמין' }, { status: 400 })

  const ownedLeagues = await db.league.findMany({ where: { createdByUserId: userId }, select: { id: true } })
  const ownedLeagueIds = ownedLeagues.map(l => l.id)
  if (ownedLeagueIds.length > 0) {
    await db.prediction.deleteMany({ where: { leagueId: { in: ownedLeagueIds } } })
    await db.leagueMember.deleteMany({ where: { leagueId: { in: ownedLeagueIds } } })
    await db.league.deleteMany({ where: { id: { in: ownedLeagueIds } } })
  }

  await db.prediction.deleteMany({ where: { userId } })
  await db.leagueMember.deleteMany({ where: { userId } })
  await db.coinBet.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })

  const res = NextResponse.json({ ok: true })
  res.cookies.set('shinu_token', '', { maxAge: 0, path: '/' })
  return res
}
