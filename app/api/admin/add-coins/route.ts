import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const updated = await db.user.update({
    where: { id: user.id },
    data: { coins: { increment: 10 } },
    select: { coins: true },
  })

  return NextResponse.json({ coins: updated.coins })
}
