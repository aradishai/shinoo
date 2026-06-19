import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postSystemMessage } from '@/lib/system-message'

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { predictionId, slot } = await request.json()
  if (!predictionId || (slot !== 1 && slot !== 2))
    return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 })

  const prediction = await db.prediction.findUnique({
    where: { id: predictionId },
    include: { match: { include: { homeTeam: true, awayTeam: true } } },
  })

  if (!prediction || prediction.userId !== userId)
    return NextResponse.json({ error: 'ניחוש לא נמצא' }, { status: 404 })

  if (prediction.match.status !== 'SCHEDULED' || new Date() >= prediction.match.lockAt)
    return NextResponse.json({ error: 'לא ניתן לשייך DOUBLE למשחק נעול' }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { doubleStock: true, username: true },
  })

  const leagueId = prediction.leagueId

  if (slot === 1) {
    if (!user || user.doubleStock < 1)
      return NextResponse.json({ error: 'אין לך DOUBLE — קנה בחנות' }, { status: 400 })

    // Check no active entry already for this league
    const existing = await (db as any).doubleEntry.findFirst({
      where: { userId, leagueId, resolved: false },
    })
    if (existing)
      return NextResponse.json({ error: 'כבר יש DOUBLE פעיל בליגה זו' }, { status: 400 })

    await db.user.update({ where: { id: userId }, data: { doubleStock: { decrement: 1 } } })
    await (db as any).doubleEntry.create({
      data: { userId, leagueId, predictionId1: predictionId },
    })
  } else {
    // slot 2
    const entry = await (db as any).doubleEntry.findFirst({
      where: { userId, leagueId, resolved: false, predictionId1: { not: null }, predictionId2: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!entry)
      return NextResponse.json({ error: 'שייך קודם DOUBLE (1)' }, { status: 400 })
    if (entry.predictionId1 === predictionId)
      return NextResponse.json({ error: 'DOUBLE (2) חייב להיות על משחק שונה' }, { status: 400 })

    // Check slot1 match isn't the same
    await (db as any).doubleEntry.update({
      where: { id: entry.id },
      data: { predictionId2: predictionId },
    })

    if (user) {
      await postSystemMessage(
        leagueId,
        userId,
        `${user.username} הפעיל DOUBLE על ${prediction.match.homeTeam.nameHe} נגד ${prediction.match.awayTeam.nameHe}`
      )
    }
  }

  const updatedUser = await db.user.findUnique({
    where: { id: userId },
    select: { doubleStock: true },
  })
  return NextResponse.json({ ok: true, doubleStock: updatedUser?.doubleStock ?? 0 })
}

export async function DELETE(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })

  const { slot, leagueId } = await request.json()
  if (!leagueId || (slot !== 1 && slot !== 2))
    return NextResponse.json({ error: 'נתונים חסרים' }, { status: 400 })

  const entry = await (db as any).doubleEntry.findFirst({
    where: { userId, leagueId, resolved: false },
    orderBy: { createdAt: 'desc' },
  })
  if (!entry) return NextResponse.json({ error: 'לא נמצא DOUBLE פעיל' }, { status: 404 })

  if (slot === 1) {
    // Check slot 1 match is not locked before clearing
    if (entry.predictionId1) {
      const pred = await db.prediction.findUnique({
        where: { id: entry.predictionId1 },
        include: { match: true },
      })
      if (pred && (pred.match.status !== 'SCHEDULED' || new Date() >= pred.match.lockAt))
        return NextResponse.json({ error: 'המשחק נעול — לא ניתן לשנות' }, { status: 400 })
    }
    // Delete entry and restore stock
    await (db as any).doubleEntry.delete({ where: { id: entry.id } })
    await db.user.update({ where: { id: userId }, data: { doubleStock: { increment: 1 } } })
  } else {
    // Check slot 2 match is not locked
    if (entry.predictionId2) {
      const pred = await db.prediction.findUnique({
        where: { id: entry.predictionId2 },
        include: { match: true },
      })
      if (pred && (pred.match.status !== 'SCHEDULED' || new Date() >= pred.match.lockAt))
        return NextResponse.json({ error: 'המשחק נעול — לא ניתן לשנות' }, { status: 400 })
    }
    await (db as any).doubleEntry.update({ where: { id: entry.id }, data: { predictionId2: null } })
  }

  const updatedUser = await db.user.findUnique({ where: { id: userId }, select: { doubleStock: true } })
  return NextResponse.json({ ok: true, doubleStock: updatedUser?.doubleStock ?? 0 })
}
