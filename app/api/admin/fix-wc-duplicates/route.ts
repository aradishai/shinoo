import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: string[] = []

  // 1. Fix Hebrew names for teams that got overwritten with English
  const teamFixes = [
    { code: 'SAU', nameHe: 'ערב הסעודית' },
    { code: 'BIH', nameHe: 'בוסניה-הרצגובינה' },
    { code: 'URU', nameHe: 'אורוגוואי' },
    { code: 'CUW', nameHe: 'קורסאו' },
  ]
  for (const t of teamFixes) {
    const team = await db.team.findFirst({ where: { code: t.code } })
    if (team && team.nameHe !== t.nameHe) {
      await db.team.update({ where: { id: team.id }, data: { nameHe: t.nameHe } })
      results.push(`Fixed team ${t.code} Hebrew name: ${t.nameHe}`)
    }
  }

  // 2. Fix duplicate matches: "בית H" records are duplicates of "בית ח'" records
  // "בית ח'" records with null providerMatchId have predictions → adopt the providerMatchId
  // "בית H" records with providerMatchId → delete them after adoption

  const bitHDups = await db.match.findMany({
    where: { round: 'בית H' },
    include: { homeTeam: true, awayTeam: true },
  })

  for (const dup of bitHDups) {
    if (!dup.providerMatchId) continue

    // Find corresponding "בית ח'" record (same teams, null providerMatchId)
    const original = await db.match.findFirst({
      where: {
        round: 'בית ח\'',
        homeTeamId: dup.homeTeamId,
        awayTeamId: dup.awayTeamId,
        providerMatchId: null,
      },
    })

    if (original) {
      // Adopt the providerMatchId into the original (which has predictions)
      await db.match.update({
        where: { id: original.id },
        data: { providerMatchId: dup.providerMatchId },
      })
      results.push(`Linked providerMatchId ${dup.providerMatchId} to original match ${original.id}`)

      // Delete the duplicate
      await db.match.delete({ where: { id: dup.id } })
      results.push(`Deleted duplicate match ${dup.id} (${dup.homeTeam.nameEn} vs ${dup.awayTeam.nameEn})`)
    }
  }

  if (results.length === 0) results.push('Nothing to fix')

  return NextResponse.json({ ok: true, results })
}
