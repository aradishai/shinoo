import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) {
      return NextResponse.json({ error: 'קוד הזמנה נדרש' }, { status: 400 })
    }

    const league = await db.league.findUnique({ where: { inviteCode } })
    if (!league) {
      return NextResponse.json({ error: 'קוד הזמנה לא תקין' }, { status: 404 })
    }

    const existingMember = await db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'כבר חבר בליגה זו' }, { status: 409 })
    }

    await db.leagueMember.create({
      data: { leagueId: league.id, userId, role: 'MEMBER' },
    })

    await db.user.update({
      where: { id: userId },
      data: { coins: { increment: 4 } },
    })

    return NextResponse.json(
      { data: { leagueId: league.id, leagueName: league.name }, message: 'הצטרפת לליגה בהצלחה!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Join league error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
