import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; messageId: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (user?.username !== 'ערד') return NextResponse.json({ error: 'אדמין בלבד' }, { status: 403 })

  const message = await db.message.findUnique({ where: { id: params.messageId } })
  if (!message || message.leagueId !== params.id)
    return NextResponse.json({ error: 'הודעה לא נמצאה' }, { status: 404 })

  await db.message.delete({ where: { id: params.messageId } })
  return NextResponse.json({ ok: true })
}
