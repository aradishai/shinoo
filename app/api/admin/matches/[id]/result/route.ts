import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recalculatePoints } from '@/lib/sync-service'
import { resolveCoinBetsForMatch } from '@/lib/resolve-coins'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { homeScore, awayScore, status } = await request.json()

    if (homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
    }

    const match = await db.match.update({
      where: { id: params.id },
      data: {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: status || 'FINISHED',
      },
    })

    await recalculatePoints(match.id)
    await resolveCoinBetsForMatch(params.id)

    return NextResponse.json({ message: 'תוצאה עודכנה ונקודות חושבו מחדש', data: match })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
