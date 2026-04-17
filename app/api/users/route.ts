import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (query.length < 1) {
      return NextResponse.json({ data: [] })
    }

    const users = await db.user.findMany({
      where: {
        username: { contains: query },
        id: { not: userId }, // exclude self
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        _count: {
          select: { leagueMembers: true, predictions: true },
        },
      },
      take: 20,
    })

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Users search error:', error)
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
