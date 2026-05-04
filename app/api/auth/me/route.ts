import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        coins: true,
        x2Stock: true,
        shinooStock: true,
        x3Stock: true,
        goalsStock: true,
        minute90Stock: true,
        splitStock: true,
        createdAt: true,
        _count: {
          select: {
            leagueMembers: true,
            predictions: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })
    }

    return NextResponse.json({ data: { ...user, isAdmin: user.username === 'ערד' } })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
