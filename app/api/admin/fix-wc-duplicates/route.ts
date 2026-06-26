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

    // Step 1: Fix Hebrew team names
    for (const [code, nameHe] of Object.entries(HEBREW_NAMES)) {
      const team = await db.team.findFirst({ where: { code } })
      if (team && team.nameHe !== nameHe) {
        await db.team.update({ where: { id: team.id }, data: { nameHe } })
        results.push(`Fixed team ${code} → ${nameHe}`)
      }
    }

    const latinRounds = Object.keys(GROUP_LETTERS).map(l => `בית ${l}`)

    // Step 2: Null out all providerMatchIds on Latin-round matches
    // (PostgreSQL allows multiple NULLs on unique nullable columns)
    // This frees up the unique constraint before we do merges/renames
    const cleared = await db.match.updateMany({
      where: { round: { in: latinRounds }, providerMatchId: { not: null } },
      data: { providerMatchId: null },
    })
    if (cleared.count > 0) results.push(`Cleared providerMatchId from ${cleared.count} Latin-round matches`)

    // Step 3: Find all Latin-round matches and process them
    const latinMatches = await db.match.findMany({
      where: { round: { in: latinRounds } },
      select: { id: true, round: true, homeTeamId: true, awayTeamId: true },
      orderBy: { kickoffAt: 'asc' },
    })

    results.push(`Found ${latinMatches.length} Latin-round matches to process`)

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
        select: { id: true },
      })

      if (hebrewMatch) {
        // Duplicate pair: delete Latin, keep Hebrew (providerMatchId will be re-linked by migrate-worldcup)
        const latinPreds = await db.prediction.count({ where: { matchId: latin.id } })
        if (latinPreds > 0) {
          // Rare: users predicted on the Latin record — rename it, delete Hebrew
          const hebrewPreds = await db.prediction.count({ where: { matchId: hebrewMatch.id } })
          if (hebrewPreds === 0) {
            await db.match.update({ where: { id: latin.id }, data: { round: hebrewRound } })
            await db.match.delete({ where: { id: hebrewMatch.id } })
            results.push(`Renamed Latin ${latin.id} → ${hebrewRound}, deleted empty Hebrew ${hebrewMatch.id}`)
          } else {
            // Both have predictions — keep Hebrew, migrate predictions from Latin
            await db.prediction.updateMany({ where: { matchId: latin.id }, data: { matchId: hebrewMatch.id } })
            await db.match.delete({ where: { id: latin.id } })
            results.push(`Migrated predictions from Latin ${latin.id} to Hebrew ${hebrewMatch.id}, deleted Latin`)
          }
        } else {
          await db.match.delete({ where: { id: latin.id } })
          results.push(`Deleted Latin dup ${latin.id} (${latin.round}), kept Hebrew ${hebrewMatch.id}`)
        }
      } else {
        // No Hebrew counterpart — just rename
        await db.match.update({ where: { id: latin.id }, data: { round: hebrewRound } })
        results.push(`Renamed: "${latin.round}" → "${hebrewRound}"`)
      }
    }

    if (results.length === 0) results.push('Nothing to fix')
    return NextResponse.json({ ok: true, v: 5, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack?.slice(0, 600) }, { status: 200 })
  }
}
