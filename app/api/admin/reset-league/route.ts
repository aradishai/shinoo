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

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { leagueName } = await request.json()
  if (!leagueName) return NextResponse.json({ error: 'חסר שם ליגה' }, { status: 400 })

  const league = await db.league.findFirst({ where: { name: leagueName }, select: { id: true, name: true } })
  if (!league) return NextResponse.json({ error: 'ליגה לא נמצאה' }, { status: 404 })

  const predictions = await db.prediction.findMany({
    where: { leagueId: league.id },
    select: { id: true },
  })
  const predictionIds = predictions.map(p => p.id)

  if (predictionIds.length > 0) {
    await db.coinBet.deleteMany({ where: { predictionId: { in: predictionIds } } })
    await db.predictionPoints.deleteMany({ where: { predictionId: { in: predictionIds } } })
    await db.prediction.deleteMany({ where: { leagueId: league.id } })
  }

  return NextResponse.json({ ok: true, deleted: predictionIds.length, league: league.name })
}
