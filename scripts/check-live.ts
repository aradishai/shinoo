import { db } from '../lib/db'

async function main() {
  const matches = await db.match.findMany({
    where: { status: { in: ['LIVE', 'PAUSED'] } },
    include: { homeTeam: true, awayTeam: true },
  })
  if (matches.length === 0) {
    console.log('No live matches in DB')
  }
  for (const m of matches) {
    const kickoff = new Date(m.kickoffAt)
    const elapsedMin = (Date.now() - kickoff.getTime()) / 60_000
    console.log(`${m.homeTeam.nameHe} vs ${m.awayTeam.nameHe} | ${m.status} | minute: ${m.minute} | ${m.homeScore}-${m.awayScore} | kickoff: ${kickoff.toISOString()} | elapsed: ${elapsedMin.toFixed(1)} min`)
  }
  await db.$disconnect()
}
main()
