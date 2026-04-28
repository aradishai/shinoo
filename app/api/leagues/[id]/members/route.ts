import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { memberId } = await request.json()
  if (!memberId) return NextResponse.json({ error: 'חסר memberId' }, { status: 400 })
  if (memberId === userId) return NextResponse.json({ error: 'לא ניתן להסיר את עצמך' }, { status: 400 })

  const requester = await db.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: params.id, userId } },
  })
  if (!requester || requester.role !== 'ADMIN')
    return NextResponse.json({ error: 'רק מנהל יכול להסיר חברים' }, { status: 403 })

  await db.leagueMember.delete({
    where: { leagueId_userId: { leagueId: params.id, userId: memberId } },
  })

  return NextResponse.json({ ok: true })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    // Check if requester is admin
    const requesterMembership = await db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: params.id, userId } },
    })

    if (!requesterMembership || requesterMembership.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'רק מנהל הליגה יכול להוסיף חברים' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json({ error: 'שם משתמש נדרש' }, { status: 400 })
    }

    const userToAdd = await db.user.findUnique({ where: { username } })
    if (!userToAdd) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    const existingMember = await db.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: params.id, userId: userToAdd.id } },
    })

    if (existingMember) {
      return NextResponse.json({ error: 'המשתמש כבר חבר בליגה' }, { status: 409 })
    }

    const member = await db.leagueMember.create({
      data: {
        leagueId: params.id,
        userId: userToAdd.id,
        role: 'MEMBER',
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    })

    return NextResponse.json(
      { data: member, message: `${username} נוסף לליגה בהצלחה!` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
