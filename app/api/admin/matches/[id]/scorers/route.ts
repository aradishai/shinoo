import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - list scorers + players for this match
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const match = await db.match.findUnique({
    where: { id: params.id },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
      scorers: { include: { player: true } },
    },
  })
  if (!match) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  return NextResponse.json({ data: match })
}

// POST - add/update scorer
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { playerId, goals } = await request.json()
  if (!playerId) return NextResponse.json({ error: 'חסר שחקן' }, { status: 400 })

  const scorer = await db.matchScorer.upsert({
    where: { matchId_playerId: { matchId: params.id, playerId } },
    update: { goals: parseInt(goals) || 1 },
    create: { matchId: params.id, playerId, goals: parseInt(goals) || 1 },
    include: { player: true },
  })

  return NextResponse.json({ data: scorer })
}

// DELETE - remove scorer
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { playerId } = await request.json()
  await db.matchScorer.delete({
    where: { matchId_playerId: { matchId: params.id, playerId } },
  })
  return NextResponse.json({ message: 'הוסר' })
}
