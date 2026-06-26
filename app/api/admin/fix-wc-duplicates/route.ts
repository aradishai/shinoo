import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const GROUP_LETTERS: Record<string, string> = {
  A: "א'", B: "ב'", C: "ג'", D: "ד'",
  E: "ה'", F: "ו'", G: "ז'", H: "ח'",
  I: "ט'", J: "י'", K: "כ'", L: "ל'",
}

const HEBREW_NAMES: Record<string, string> = {
  SAU: 'ערב הסעודית',
  KSA: 'ערב הסעודית',
  BIH: 'בוסניה-הרצגובינה',
  URU: 'אורוגואי',
  URY: 'אורוגואי',
  CUW: 'קורסאו',
  CUR: 'קורסאו',
}

export async function GET() {
  try {
    const results: string[] = []

    // Step 1: Fix Hebrew names
    for (const [code, nameHe] of Object.entries(HEBREW_NAMES)) {
      const team = await db.team.findFirst({ where: { code } })
      if (team && team.nameHe !== nameHe) {
        await db.team.update({ where: { id: team.id }, data: { nameHe } })
        results.push(`Fixed team ${code}`)
      }
    }

    // Step 2: Find all Latin-letter group round matches
    const latinRounds = Object.keys(GROUP_LETTERS).map(l => `בית ${l}`)

    const latinMatches = await db.match.findMany({
      where: { round: { in: latinRounds } },
      select: { id: true, round: true, homeTeamId: true, awayTeamId: true, providerMatchId: true },
      orderBy: { kickoffAt: 'asc' },
    })

    results.push(`Found ${latinMatches.length} Latin-round matches`)

    for (const latin of latinMatches) {
      const letter = latin.round!.replace('בית ', '')
      const hebrewRound = `בית ${GROUP_LETTERS[letter] ?? letter}`

      const hebrewMatch = await db.match.findFirst({
        where: {
          round: hebrewRound,
          OR: [
            { homeTeamId: latin.homeTeamId, awayTeamId: latin.awayTeamId },
            { homeTeamId: latin.awayTeamId, awayTeamId: latin.homeTeamId },
          ],
        },
        select: { id: true, providerMatchId: true },
      })

      if (hebrewMatch) {
        const hebrewPreds = await db.prediction.count({ where: { matchId: hebrewMatch.id } })
        const latinPreds = await db.prediction.count({ where: { matchId: latin.id } })

        if (hebrewPreds > 0) {
          // Hebrew has predictions → it's the keeper
          // Delete Latin FIRST (to free up the providerMatchId unique constraint)
          const latinProviderId = latin.providerMatchId
          await db.match.delete({ where: { id: latin.id } })
          // Now link the providerMatchId to the Hebrew record
          if (latinProviderId && !hebrewMatch.providerMatchId) {
            await db.match.update({ where: { id: hebrewMatch.id }, data: { providerMatchId: latinProviderId } })
          }
          results.push(`Deleted Latin dup ${latin.id} (${latin.round}), linked ${latinProviderId} to Hebrew ${hebrewMatch.id}`)
        } else if (latinPreds > 0) {
          // Latin has predictions → rename Latin to Hebrew, delete empty Hebrew
          await db.match.update({ where: { id: latin.id }, data: { round: hebrewRound } })
          await db.match.delete({ where: { id: hebrewMatch.id } })
          results.push(`Renamed Latin ${latin.id} → ${hebrewRound}, deleted empty Hebrew ${hebrewMatch.id}`)
        } else {
          // Neither has predictions → delete the Latin one
          await db.match.delete({ where: { id: latin.id } })
          results.push(`Deleted empty Latin dup ${latin.id} (${latin.round})`)
        }
      } else {
        // No Hebrew counterpart — just rename
        await db.match.update({ where: { id: latin.id }, data: { round: hebrewRound } })
        results.push(`Renamed: "${latin.round}" → "${hebrewRound}"`)
      }
    }

    if (results.length === 0) results.push('Nothing to fix')
    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack?.slice(0, 500) }, { status: 200 })
  }
}
