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
): ScoringResult {
  let resultPoints = 0
  const explanationParts: string[] = []

  const predictedOutcome = getMatchOutcome(predictedHome, predictedAway)
  const actualOutcome = getMatchOutcome(actualHome, actualAway)

  const isExactScore = predictedHome === actualHome && predictedAway === actualAway
  const isCorrectOutcome = predictedOutcome === actualOutcome

  if (isExactScore) {
    resultPoints = 5
    explanationParts.push('תוצאה מדויקת: 5 נקודות')
  } else if (isCorrectOutcome) {
    const homeExact = predictedHome === actualHome
    const awayExact = predictedAway === actualAway
    const isDraw = actualOutcome === 'draw'
    if (homeExact || awayExact) {
      resultPoints = 3
      const teamName = homeExact ? 'הקבוצה הביתית' : 'הקבוצה האורחת'
      explanationParts.push(`מגמה נכונה + ${teamName} מדויקת: 3 נקודות`)
    } else if (isDraw) {
      resultPoints = 2
      explanationParts.push('תיקו נכון: 2 נקודות')
    } else {
      resultPoints = 1
      explanationParts.push('מגמה נכונה: 1 נקודה')
    }
  } else {
    resultPoints = 0
    explanationParts.push('מגמה שגויה: 0 נקודות')
  }

  return {
    resultPoints,
    topScorerPoints: 0,
    totalPoints: resultPoints,
    explanation: explanationParts.join(' | '),
  }
}

export function getOutcomeLabel(home: number, away: number): string {
  if (home > away) return 'ניצחון ביתי'
  if (home < away) return 'ניצחון אורחים'
  return 'תיקו'
}
