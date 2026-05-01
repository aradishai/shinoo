import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const user = { id: session.userId }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { coins: { increment: 10 } },
    select: { coins: true },
  })

  return NextResponse.json({ coins: updated.coins })
}
