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

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const users = await db.user.findMany({
    select: {
      id: true,
      username: true,
      coins: true,
      createdAt: true,
      leagueMembers: {
        include: {
          league: {
            include: {
              _count: { select: { members: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = users.map(u => ({
    id: u.id,
    username: u.username,
    coins: u.coins,
    createdAt: u.createdAt,
    managedLeagues: u.leagueMembers
      .filter(m => m.role === 'ADMIN')
      .map(m => ({ id: m.league.id, name: m.league.name, memberCount: m.league._count.members })),
    joinedLeaguesCount: u.leagueMembers.length,
  }))

  return NextResponse.json({ users: result })
}
