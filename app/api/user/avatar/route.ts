import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ALLOWED = ['⚽','🏆','🦁','🐯','🦅','🐲','🔥','⚡','👑','💎','🦸','🦈','🤖','👻','🐼','🐻','🦊','🐺','🎯','🌟','🎭','🤴','🏴‍☠️','🦄','💫']

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  const { avatar } = await request.json()
  if (!avatar || !ALLOWED.includes(avatar)) return NextResponse.json({ error: 'אייקון לא חוקי' }, { status: 400 })
  await db.user.update({ where: { id: userId }, data: { avatar } })
  return NextResponse.json({ ok: true })
}
