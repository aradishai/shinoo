import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { tournamentIds } = await request.json()
  if (!Array.isArray(tournamentIds)) return NextResponse.json({ error: 'שגיאה' }, { status: 400 })

  await db.user.update({
    where: { id: userId },
    data: { notifyTournamentIds: tournamentIds },
  })

  return NextResponse.json({ ok: true })
}
