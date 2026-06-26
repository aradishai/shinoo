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

  // 2. Fix specific known duplicate matches
  // "בית H" duplicates: vjnz1xs5 (Uruguay vs Spain, fd-537373) and lx7acl96 (Cape Verde vs Saudi Arabia, fd-537374)
  // "בית ח'" originals with predictions: 8sn7elw5 (Uruguay vs Spain) and ba8jj9dy (Cape Verde vs Saudi Arabia)
  const fixes = [
    { originalSuffix: '8sn7elw5', dupSuffix: 'vjnz1xs5', providerMatchId: 'fd-537373' },
    { originalSuffix: 'ba8jj9dy', dupSuffix: 'lx7acl96', providerMatchId: 'fd-537374' },
  ]

  for (const fix of fixes) {
    const original = await db.match.findFirst({ where: { id: { endsWith: fix.originalSuffix } } })
    const dup = await db.match.findFirst({ where: { id: { endsWith: fix.dupSuffix } } })

    if (original) {
      await db.match.update({ where: { id: original.id }, data: { providerMatchId: fix.providerMatchId } })
      results.push(`Linked ${fix.providerMatchId} to original ${original.id}`)
    }
    if (dup) {
      await db.match.delete({ where: { id: dup.id } })
      results.push(`Deleted duplicate ${dup.id}`)
    }
  }

  if (results.length === 0) results.push('Nothing to fix')

  return NextResponse.json({ ok: true, results })
}
