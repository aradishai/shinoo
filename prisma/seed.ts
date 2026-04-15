import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Tournament ──────────────────────────────────────────
  const tournament = await db.tournament.upsert({
    where: { slug: 'wc-2026' },
    update: {},
    create: {
      name: 'FIFA World Cup 2026',
      nameHe: 'מונדיאל 2026',
      slug: 'wc-2026',
      type: 'world_cup',
      isActive: true,
      season: '2026',
    },
  })
  console.log('✅ Tournament created:', tournament.nameHe)

  // ── Teams ────────────────────────────────────────────────
  const teamsData = [
    { nameHe: 'ברזיל', nameEn: 'Brazil', code: 'BRA', flagUrl: 'https://flagcdn.com/br.svg' },
    { nameHe: 'ארגנטינה', nameEn: 'Argentina', code: 'ARG', flagUrl: 'https://flagcdn.com/ar.svg' },
    { nameHe: 'צרפת', nameEn: 'France', code: 'FRA', flagUrl: 'https://flagcdn.com/fr.svg' },
    { nameHe: 'אנגליה', nameEn: 'England', code: 'ENG', flagUrl: 'https://flagcdn.com/gb-eng.svg' },
    { nameHe: 'גרמניה', nameEn: 'Germany', code: 'GER', flagUrl: 'https://flagcdn.com/de.svg' },
    { nameHe: 'ספרד', nameEn: 'Spain', code: 'ESP', flagUrl: 'https://flagcdn.com/es.svg' },
    { nameHe: 'פורטוגל', nameEn: 'Portugal', code: 'POR', flagUrl: 'https://flagcdn.com/pt.svg' },
    { nameHe: 'מרוקו', nameEn: 'Morocco', code: 'MAR', flagUrl: 'https://flagcdn.com/ma.svg' },
  ]

  const teams: Record<string, { id: string; code: string }> = {}

  for (const teamData of teamsData) {
    const team = await db.team.upsert({
      where: { code: teamData.code },
      update: { nameHe: teamData.nameHe, nameEn: teamData.nameEn, flagUrl: teamData.flagUrl },
      create: teamData,
    })
    teams[teamData.code] = { id: team.id, code: team.code }
  }
  console.log('✅ Teams created:', Object.keys(teams).length)

  // ── Players ──────────────────────────────────────────────
  const playersData: Record<string, { nameHe: string; nameEn: string }[]> = {
    BRA: [
      { nameHe: 'וינישיוס ג\'וניור', nameEn: 'Vinicius Jr.' },
      { nameHe: 'רודריגו', nameEn: 'Rodrigo' },
      { nameHe: 'ראפינייה', nameEn: 'Raphinha' },
      { nameHe: 'גבריאל ז\'סוס', nameEn: 'Gabriel Jesus' },
    ],
    ARG: [
      { nameHe: 'ליאו מסי', nameEn: 'Lionel Messi' },
      { nameHe: 'חוליאן אלבארס', nameEn: 'Julian Alvarez' },
      { nameHe: 'לאוטרו מרטינס', nameEn: 'Lautaro Martinez' },
      { nameHe: 'דיבאלה', nameEn: 'Paulo Dybala' },
    ],
    FRA: [
      { nameHe: 'קיליאן מבאפה', nameEn: 'Kylian Mbappe' },
      { nameHe: 'אנטואן גריזמן', nameEn: 'Antoine Griezmann' },
      { nameHe: 'אוסמאן דמבלה', nameEn: 'Ousmane Dembele' },
      { nameHe: 'מרקוס תוראם', nameEn: 'Marcus Thuram' },
    ],
    ENG: [
      { nameHe: 'הארי קיין', nameEn: 'Harry Kane' },
      { nameHe: 'ג\'וד בלינגהאם', nameEn: 'Jude Bellingham' },
      { nameHe: 'פיל פודן', nameEn: 'Phil Foden' },
      { nameHe: 'בוקאיו סאקא', nameEn: 'Bukayo Saka' },
    ],
    GER: [
      { nameHe: 'פלוריאן ווירץ', nameEn: 'Florian Wirtz' },
      { nameHe: 'לרוי סאנה', nameEn: 'Leroy Sane' },
      { nameHe: 'ג\'מאל מוסיאלה', nameEn: 'Jamal Musiala' },
      { nameHe: 'ניקלאס פולקרוג', nameEn: 'Niclas Fullkrug' },
    ],
    ESP: [
      { nameHe: 'לאמין ימאל', nameEn: 'Lamine Yamal' },
      { nameHe: 'ניקו וויליאמס', nameEn: 'Nico Williams' },
      { nameHe: 'פאבי רואיז', nameEn: 'Fabian Ruiz' },
      { nameHe: 'דאני אולמו', nameEn: 'Dani Olmo' },
    ],
    POR: [
      { nameHe: 'כריסטיאנו רונאלדו', nameEn: 'Cristiano Ronaldo' },
      { nameHe: 'ברונו פרננדס', nameEn: 'Bruno Fernandes' },
      { nameHe: 'ראפאל לאו', nameEn: 'Rafael Leao' },
      { nameHe: 'ז\'ואאו פליקס', nameEn: 'Joao Felix' },
    ],
    MAR: [
      { nameHe: 'אכרף חקימי', nameEn: 'Achraf Hakimi' },
      { nameHe: 'חאקים זיאך', nameEn: 'Hakim Ziyech' },
      { nameHe: 'יוסף א-נסירי', nameEn: 'Youssef En-Nesyri' },
      { nameHe: 'סופיאן אמראבאט', nameEn: 'Sofyan Amrabat' },
    ],
  }

  const playerIds: Record<string, string> = {}

  for (const [code, players] of Object.entries(playersData)) {
    const team = teams[code]
    if (!team) continue

    for (const player of players) {
      const existing = await db.player.findFirst({
        where: { teamId: team.id, nameEn: player.nameEn },
      })

      const p = existing
        ? await db.player.update({ where: { id: existing.id }, data: player })
        : await db.player.create({ data: { ...player, teamId: team.id } })

      playerIds[player.nameEn] = p.id
    }
  }
  console.log('✅ Players created:', Object.keys(playerIds).length)

  // ── Matches ──────────────────────────────────────────────
  const now = new Date()
  const day = (offset: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(20, 0, 0, 0)
    return d
  }

  const matchesData = [
    { home: 'BRA', away: 'ARG', offsetDays: 1, round: 'שלב הבתים - יום 1' },
    { home: 'FRA', away: 'ENG', offsetDays: 1, round: 'שלב הבתים - יום 1' },
    { home: 'GER', away: 'ESP', offsetDays: 2, round: 'שלב הבתים - יום 2' },
    { home: 'POR', away: 'MAR', offsetDays: 2, round: 'שלב הבתים - יום 2' },
    { home: 'ARG', away: 'FRA', offsetDays: 5, round: 'שמינית גמר' },
    { home: 'BRA', away: 'ENG', offsetDays: 5, round: 'שמינית גמר' },
  ]

  for (const matchData of matchesData) {
    const kickoffAt = day(matchData.offsetDays)
    const lockAt = new Date(kickoffAt.getTime() - 3 * 60 * 60 * 1000)

    const homeTeam = teams[matchData.home]
    const awayTeam = teams[matchData.away]

    if (!homeTeam || !awayTeam) continue

    await db.match.create({
      data: {
        tournamentId: tournament.id,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAt,
        lockAt,
        status: 'SCHEDULED',
        round: matchData.round,
      },
    })
  }
  console.log('✅ Matches created:', matchesData.length)

  // ── Users ────────────────────────────────────────────────
  const passwordHash1 = await bcrypt.hash('test1', 12)
  const passwordHash2 = await bcrypt.hash('test2', 12)

  const user1 = await db.user.upsert({
    where: { username: 'test1' },
    update: {},
    create: { username: 'test1', passwordHash: passwordHash1 },
  })

  const user2 = await db.user.upsert({
    where: { username: 'test2' },
    update: {},
    create: { username: 'test2', passwordHash: passwordHash2 },
  })
  console.log('✅ Users created: test1, test2')

  // ── League ───────────────────────────────────────────────
  const existingLeague = await db.league.findFirst({
    where: { name: 'ליגת הבדיקה' },
  })

  if (!existingLeague) {
    const league = await db.league.create({
      data: {
        name: 'ליגת הבדיקה',
        createdByUserId: user1.id,
        inviteCode: nanoid(8),
        tournamentId: tournament.id,
        members: {
          create: [
            { userId: user1.id, role: 'ADMIN' },
            { userId: user2.id, role: 'MEMBER' },
          ],
        },
      },
    })
    console.log('✅ Test league created:', league.name, '| Code:', league.inviteCode)
  } else {
    console.log('ℹ️  Test league already exists:', existingLeague.inviteCode)
  }

  console.log('\n🎉 Seed complete!')
  console.log('   Login: test1 / test1')
  console.log('   Login: test2 / test2')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
