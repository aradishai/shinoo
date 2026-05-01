import { db } from '@/lib/db'

export async function resolveCoinBetsForMatch(matchId: string) {
  const predictions = await db.prediction.findMany({
    where: { matchId },
    include: {
      points: true,
      coinBet: true,
    },
  })

  for (const pred of predictions) {
    const bet = pred.coinBet
    if (!bet || bet.resolvedAt) continue

    const resultPoints = pred.points?.resultPoints ?? 0
    const coinsEarned = resultPoints * bet.betAmount

    await db.coinBet.update({
      where: { id: bet.id },
      data: { coinsEarned, resolvedAt: new Date() },
    })

    if (coinsEarned > 0) {
      await db.user.update({
        where: { id: pred.userId },
        data: { coins: { increment: coinsEarned } },
      })
    }
  }
}
