import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
  }

  const log: string[] = []

  // Step 1: Find all WC matches grouped by home+away teams
  const allWC = await db.match.findMany({
    where: { kickoffAt: { gte: new Date('2026-06-01') } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { id: 'asc' },
  })

  const groups = new Map<string, typeof allWC>()
  for (const m of allWC) {
    const key = `${m.homeTeamId}-${m.awayTeamId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }

  let fixed = 0

  for (const [, group] of groups) {
    if (group.length < 2) continue

    const withProvider = group.filter(m => m.providerMatchId)
    const withoutProvider = group.filter(m => !m.providerMatchId)
    if (!withProvider.length || !withoutProvider.length) continue

    const correctMatch = withProvider[0]   // new match — has correct providerMatchId but no predictions
    const keepMatch = withoutProvider[0]   // old match — has predictions but no providerMatchId

    // 1. Delete the new match (no predictions on it)
    await db.match.delete({ where: { id: correctMatch.id } })

    // 2. Update the old match (with predictions) to have the correct providerMatchId + correct times
    await db.match.update({
      where: { id: keepMatch.id },
      data: {
        providerMatchId: correctMatch.providerMatchId,
        kickoffAt: correctMatch.kickoffAt,
        lockAt: correctMatch.lockAt,
        round: correctMatch.round,
        tournamentId: correctMatch.tournamentId,
      },
    })

    log.push(`${keepMatch.homeTeam.nameHe} vs ${keepMatch.awayTeam.nameHe} ✓`)
    fixed++
  }

  // Step 2: Fix Hebrew team names
  const teamFixes: [string[], string][] = [
    [['BIH'], 'בוסניה והרצגובינה'],
    [['CPV'], 'קייפ ורד'],
    [['COD'], 'קונגו DR'],
    [['CUW', 'CUR'], 'קוראסאו'],
    [['HAI', 'HTI'], 'האיטי'],
    [['NZL'], 'ניו זילנד'],
    [['KSA', 'SAU'], 'ערב הסעודית'],
    [['URY', 'URU'], 'אורוגוואי'],
  ]

  let teamsFixed = 0
  for (const [codes, nameHe] of teamFixes) {
    const r = await db.team.updateMany({ where: { code: { in: codes } }, data: { nameHe } })
    teamsFixed += r.count
  }

  const totalMatches = await db.match.count()
  const wcMatches = await db.match.count({ where: { kickoffAt: { gte: new Date('2026-06-01') } } })

  return NextResponse.json({ ok: true, fixed, teamsFixed, totalMatches, wcMatches, log })
}
