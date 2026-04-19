const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../dev.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const arsTeam = db.prepare("SELECT id FROM Team WHERE code = 'ARS'").get()
const mciTeam = db.prepare("SELECT id FROM Team WHERE code = 'MCI'").get()

if (!arsTeam || !mciTeam) {
  console.error('Teams not found')
  process.exit(1)
}

const match = db.prepare(`
  SELECT id FROM Match WHERE homeTeamId = ? AND awayTeamId = ?
`).get(arsTeam.id, mciTeam.id)

if (!match) {
  console.error('Match not found')
  process.exit(1)
}

db.prepare(`
  UPDATE Match SET homeScore = 1, awayScore = 3, status = 'FINISHED' WHERE id = ?
`).run(match.id)

console.log('✅ תוצאה עודכנה: ארסנל 1 - מנצ\'סטר סיטי 3')

// Calculate points for all predictions on this match
const predictions = db.prepare(`SELECT * FROM Prediction WHERE matchId = ?`).all(match.id)

for (const pred of predictions) {
  const homeCorrect = pred.predictedHomeScore === 1
  const awayCorrect = pred.predictedAwayScore === 3
  const exactScore = homeCorrect && awayCorrect
  const correctResult = (pred.predictedHomeScore < pred.predictedAwayScore) // City win

  let points = 0
  let explanation = ''

  if (exactScore) {
    points = 3
    explanation = 'תוצאה מדויקת'
  } else if (correctResult) {
    points = 1
    explanation = 'כיוון נכון'
  } else {
    explanation = 'ניחוש שגוי'
  }

  db.prepare(`
    INSERT INTO PredictionPoints (id, predictionId, resultPoints, topScorerPoints, totalPoints, explanation)
    VALUES (hex(randomblob(16)), ?, ?, 0, ?, ?)
    ON CONFLICT(predictionId) DO UPDATE SET resultPoints=?, totalPoints=?, explanation=?
  `).run(pred.id, points, points, explanation, points, points, explanation)

  console.log(`✅ משתמש ${pred.userId}: ${points} נקודות — ${explanation}`)
}

db.close()
