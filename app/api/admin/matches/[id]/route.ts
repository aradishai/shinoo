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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.kickoffAt) data.kickoffAt = new Date(body.kickoffAt)
  if (body.lockAt) data.lockAt = new Date(body.lockAt)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 })
  }

  const match = await db.match.update({
    where: { id: params.id },
    data,
    include: { homeTeam: true, awayTeam: true },
  })

  return NextResponse.json({ ok: true, match })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const predIds = await db.prediction.findMany({
    where: { matchId: params.id },
    select: { id: true },
  }).then(ps => ps.map(p => p.id))

  if (predIds.length > 0) {
    await db.predictionPoints.deleteMany({ where: { predictionId: { in: predIds } } })
    await db.prediction.deleteMany({ where: { id: { in: predIds } } })
  }

  await db.match.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
