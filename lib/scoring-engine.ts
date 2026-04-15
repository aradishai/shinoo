export type ScoringResult = {
  resultPoints: number
  topScorerPoints: number
  totalPoints: number
  explanation: string
}

function getMatchOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  predictedTopScorerPlayerId: string | null,
  actualTopScorerPlayerIds: string[]
): ScoringResult {
  let resultPoints = 0
  let topScorerPoints = 0
  const explanationParts: string[] = []

  const predictedOutcome = getMatchOutcome(predictedHome, predictedAway)
  const actualOutcome = getMatchOutcome(actualHome, actualAway)

  const isExactScore = predictedHome === actualHome && predictedAway === actualAway
  const isCorrectOutcome = predictedOutcome === actualOutcome

  if (isExactScore) {
    resultPoints = 5
    explanationParts.push('ניחוש תוצאה מדויק: 5 נקודות')
  } else if (isCorrectOutcome) {
    const homeExact = predictedHome === actualHome
    const awayExact = predictedAway === actualAway

    if (homeExact || awayExact) {
      resultPoints = 3
      const teamName = homeExact ? 'הקבוצה הביתית' : 'הקבוצה האורחת'
      explanationParts.push(`מגמה נכונה + ${teamName} מדויקת: 3 נקודות`)
    } else {
      resultPoints = 1
      explanationParts.push('מגמה נכונה בלבד: נקודה אחת')
    }
  } else {
    resultPoints = 0
    explanationParts.push('מגמה שגויה: 0 נקודות')
  }

  // Top scorer bonus
  if (
    predictedTopScorerPlayerId &&
    actualTopScorerPlayerIds.length > 0 &&
    actualTopScorerPlayerIds.includes(predictedTopScorerPlayerId)
  ) {
    topScorerPoints = 2
    explanationParts.push('מלך שערים נכון: +2 נקודות')
  } else if (predictedTopScorerPlayerId && actualTopScorerPlayerIds.length > 0) {
    explanationParts.push('מלך שערים שגוי: +0 נקודות')
  }

  const totalPoints = resultPoints + topScorerPoints

  return {
    resultPoints,
    topScorerPoints,
    totalPoints,
    explanation: explanationParts.join(' | '),
  }
}

export function getOutcomeLabel(home: number, away: number): string {
  if (home > away) return 'ניצחון ביתי'
  if (home < away) return 'ניצחון אורחים'
  return 'תיקו'
}
