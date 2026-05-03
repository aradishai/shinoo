import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_USERNAMES = ['ערד']

async function requireAdmin(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  return user && ADMIN_USERNAMES.includes(user.username) ? user : null
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const target = await db.user.findUnique({ where: { id: params.id }, select: { username: true } })
  if (!target) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
  if (ADMIN_USERNAMES.includes(target.username))
    return NextResponse.json({ error: 'לא ניתן למחוק אדמין' }, { status: 400 })

  await db.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
