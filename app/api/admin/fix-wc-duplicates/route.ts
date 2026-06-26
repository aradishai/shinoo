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
  URU: 'אורוגוואי',
  URY: 'אורוגוואי',
  CUW: 'קורסאו',
  CUR: 'קורסאו',
}

export async function GET() {
  const results: string[] = []

  // 1. Fix Hebrew names for teams that got overwritten with English
  for (const [code, nameHe] of Object.entries(HEBREW_NAMES)) {
    const team = await db.team.findFirst({ where: { code } })
    if (team && team.nameHe !== nameHe) {
      await db.team.update({ where: { id: team.id }, data: { nameHe } })
      results.push(`Fixed team ${code} → ${nameHe}`)
    }
  }

  // 2. Find all group matches with Latin-letter round names (e.g. "בית H", "בית A")
  const latinRounds = Object.keys(GROUP_LETTERS).map(l => `בית ${l}`)
  const latinMatches = await db.match.findMany({
    where: { round: { in: latinRounds } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'asc' },
  })

  results.push(`Found ${latinMatches.length} matches with Latin-letter round names`)

  for (const latin of latinMatches) {
    const letter = latin.round!.replace('בית ', '')
    const hebrewRound = `בית ${GROUP_LETTERS[letter] ?? letter}`

    // Look for a Hebrew-round match with same teams (could be in either order)
    const hebrewMatch = await db.match.findFirst({
      where: {
        round: hebrewRound,
        OR: [
          { homeTeamId: latin.homeTeamId, awayTeamId: latin.awayTeamId },
          { homeTeamId: latin.awayTeamId, awayTeamId: latin.homeTeamId },
        ],
      },
    })

    if (hebrewMatch) {
      // Duplicate pair: one Hebrew (original), one Latin (new)
      const hebrewPreds = await db.prediction.count({ where: { matchId: hebrewMatch.id } })
      const latinPreds = await db.prediction.count({ where: { matchId: latin.id } })

      if (hebrewPreds > 0) {
        // Hebrew record has predictions → it's the keeper
        // Adopt the providerMatchId from the Latin record if it has one
        if (latin.providerMatchId && !hebrewMatch.providerMatchId) {
          await db.match.update({
            where: { id: hebrewMatch.id },
            data: { providerMatchId: latin.providerMatchId },
          })
          results.push(`Linked ${latin.providerMatchId} to Hebrew match ${hebrewMatch.id}`)
        }
        await db.match.delete({ where: { id: latin.id } })
        results.push(`Deleted Latin duplicate ${latin.id} (${latin.homeTeam.nameEn} vs ${latin.awayTeam.nameEn}, ${latin.round})`)
      } else if (latinPreds > 0) {
        // Latin record has predictions → rename it to Hebrew, delete the Hebrew one
        await db.match.update({
          where: { id: latin.id },
          data: { round: hebrewRound },
        })
        await db.match.delete({ where: { id: hebrewMatch.id } })
        results.push(`Renamed Latin ${latin.id} to ${hebrewRound}, deleted empty Hebrew ${hebrewMatch.id}`)
      } else {
        // Neither has predictions → keep the Hebrew one, delete the Latin
        await db.match.delete({ where: { id: latin.id } })
        results.push(`Deleted empty Latin duplicate ${latin.id} (${latin.round})`)
      }
    } else {
      // No Hebrew counterpart — just rename
      await db.match.update({
        where: { id: latin.id },
        data: { round: hebrewRound },
      })
      results.push(`Renamed ${latin.id}: "${latin.round}" → "${hebrewRound}" (${latin.homeTeam.nameEn} vs ${latin.awayTeam.nameEn})`)
    }
  }

  if (results.length === 0) results.push('Nothing to fix')

  return NextResponse.json({ ok: true, results })
}
