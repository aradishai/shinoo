import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

function getUserId(): string | null {
  const token = cookies().get('shinu_token')?.value
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.userId ?? null
  } catch { return null }
}

export async function POST(request: Request) {
  const userId = getUserId()
  if (!userId) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 })

  const { interests } = await request.json()
  if (!Array.isArray(interests)) return NextResponse.json({ error: 'שגיאה' }, { status: 400 })

  await db.user.update({ where: { id: userId }, data: { interests } })
  return NextResponse.json({ ok: true })
}
