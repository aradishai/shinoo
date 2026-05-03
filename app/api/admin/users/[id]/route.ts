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

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
