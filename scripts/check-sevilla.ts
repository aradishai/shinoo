import { db } from '../lib/db'

async function main() {
  // Find Sevilla vs Espanyol specifically
  const match = await db.match.findFirst({
    where: {
      AND: [
        { homeTeam: { nameHe: { contains: 'סביליה' } } },
        { awayTeam: { nameHe: { contains: 'ספניול' } } },
      ],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffAt: 'desc' },
  })
  if (!match) {
    // try other direction
    const m2 = await db.match.findFirst({
      where: {
        AND: [
          { homeTeam: { nameHe: { contains: 'ספניול' } } },
          { awayTeam: { nameHe: { contains: 'סביליה' } } },
        ],
      },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffAt: 'desc' },
    })
    if (m2) {
      const e = (Date.now() - new Date(m2.kickoffAt).getTime()) / 60000
      console.log(`${m2.homeTeam.nameHe} vs ${m2.awayTeam.nameHe} | ${m2.status} | apiMinute:${m2.minute} | elapsed:${e.toFixed(1)}min | kickoff:${m2.kickoffAt}`)
    } else {
      console.log('not found')
    }
    await db.$disconnect()
    return
  }
  const e = (Date.now() - new Date(match.kickoffAt).getTime()) / 60000
  console.log(`${match.homeTeam.nameHe} vs ${match.awayTeam.nameHe} | ${match.status} | apiMinute:${match.minute} | elapsed:${e.toFixed(1)}min | kickoff:${match.kickoffAt}`)
  await db.$disconnect()
}
main()
