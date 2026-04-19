const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../dev.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const { randomUUID } = require('crypto')

const arsenalId = randomUUID()
const cityId = randomUUID()
const tournamentId = db.prepare("SELECT id FROM Tournament LIMIT 1").get()?.id

if (!tournamentId) {
  console.error('No tournament found')
  process.exit(1)
}

db.prepare("INSERT OR IGNORE INTO Team (id, nameHe, nameEn, code, flagUrl) VALUES (?, ?, ?, ?, ?)").run(arsenalId, 'ארסנל', 'Arsenal', 'ARS', 'https://media.api-sports.io/football/teams/42.png')
db.prepare("INSERT OR IGNORE INTO Team (id, nameHe, nameEn, code, flagUrl) VALUES (?, ?, ?, ?, ?)").run(cityId, 'מנצ\'סטר סיטי', 'Manchester City', 'MCI', 'https://media.api-sports.io/football/teams/50.png')

const existingArs = db.prepare("SELECT id FROM Team WHERE code = 'ARS'").get()
const existingMci = db.prepare("SELECT id FROM Team WHERE code = 'MCI'").get()

const kickoff = new Date('2026-04-19T15:30:00Z') // 18:30 Israel time
const lockAt = new Date('2026-04-19T15:25:00Z') // lock at 18:25

const matchId = randomUUID()
db.prepare(`
  INSERT OR IGNORE INTO Match (id, tournamentId, homeTeamId, awayTeamId, kickoffAt, lockAt, status, round)
  VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED', 'פרמיר ליג')
`).run(matchId, tournamentId, existingArs.id, existingMci.id, kickoff.toISOString(), lockAt.toISOString())

console.log('✅ נוסף משחק: ארסנל vs מנצ\'סטר סיטי')
db.close()
