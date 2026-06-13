import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { username, newPassword } = await request.json()
  if (!username || !newPassword) return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  if (newPassword.length < 4) return NextResponse.json({ error: 'סיסמה חייבת להיות לפחות 4 תווים' }, { status: 400 })

  const user = await db.user.findUnique({ where: { username }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
