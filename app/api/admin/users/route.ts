import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ADMIN_USERNAMES = ['ערד']

async function requireAdmin(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  return user && ADMIN_USERNAMES.includes(user.username) ? user : null
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const users = await db.user.findMany({
    select: { id: true, username: true, coins: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}
