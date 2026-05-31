import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY!

const HEBREW_NAMES: Record<string, string> = {
  ARG: 'ארגנטינה',
  BRA: 'ברזיל',
  FRA: 'צרפת',
  ENG: 'אנגליה',
  ESP: 'ספרד',
  GER: 'גרמניה',
  POR: 'פורטוגל',
  NED: 'הולנד',
  BEL: 'בלגיה',
  ITA: 'איטליה',
  URU: 'אורוגוואי',
  MEX: 'מקסיקו',
  USA: 'ארה"ב',
  CAN: 'קנדה',
  MAR: 'מרוקו',
  SEN: 'סנגל',
  NGA: 'ניגריה',
  CMR: 'קמרון',
  GHA: 'גאנה',
  CIV: "חוף השנהב",
  MLI: 'מאלי',
  EGY: 'מצרים',
  TUN: 'תוניסיה',
  ALG: 'אלג\'יריה',
  RSA: 'דרום אפריקה',
  KEN: 'קניה',
  JPN: 'יפן',
  KOR: 'קוריאה הדרומית',
  AUS: 'אוסטרליה',
  IRN: 'איראן',
  SAU: 'ערב הסעודית',
  QAT: 'קטאר',
  IRQ: 'עיראק',
  JOR: 'ירדן',
  CHN: 'סין',
  IND: 'הודו',
  UZB: 'אוזבקיסטן',
  CRO: 'קרואטיה',
  SRB: 'סרביה',
  SUI: 'שוויץ',
  AUT: 'אוסטריה',
  DEN: 'דנמרק',
  SWE: 'שוודיה',
  NOR: 'נורווגיה',
  POL: 'פולין',
  CZE: 'צ\'כיה',
  HUN: 'הונגריה',
  ROU: 'רומניה',
  UKR: 'אוקראינה',
  TUR: 'טורקיה',
  GRE: 'יוון',
  SVK: 'סלובקיה',
  SVN: 'סלובניה',
  SCO: 'סקוטלנד',
  WAL: 'וולס',
  IRL: 'אירלנד',
  ECU: 'אקוודור',
  PER: 'פרו',
  CHL: 'צ\'ילה',
  VEN: 'ונצואלה',
  PAR: 'פרגוואי',
  BOL: 'בוליביה',
  COL: 'קולומביה',
  PAN: 'פנמה',
  CRC: 'קוסטה ריקה',
  HON: 'הונדורס',
  JAM: 'ג\'מייקה',
  TRI: 'טרינידד וטובגו',
}

export async function GET() {
  try {
    const res = await axios.get(`${FD_API}/competitions/WC/matches?status=SCHEDULED,TIMED`, {
      headers: { 'X-Auth-Token': FD_KEY },
    })
    const matches = res.data.matches as any[]

    if (!matches || matches.length === 0) {
      return NextResponse.json({ error: 'אין משחקים מה-API' }, { status: 404 })
    }

    const tournament = await db.tournament.upsert({
      where: { slug: 'world-cup-2026' },
      update: { isActive: true },
      create: {
        name: 'FIFA World Cup 2026',
        nameHe: 'מונדיאל 2026',
        slug: 'world-cup-2026',
        type: 'cup',
        season: '2026',
        isActive: true,
      },
    })

    // Remove old WC matches without providerMatchId (created by sync before proper import)
    await db.match.deleteMany({
      where: { tournamentId: tournament.id, providerMatchId: null },
    })

    let inserted = 0
    for (const m of matches) {
      const homeData = m.homeTeam
      const awayData = m.awayTeam
      if (!homeData?.tla || !awayData?.tla) continue

      const homeTeam = await db.team.upsert({
        where: { code: homeData.tla },
        update: { nameEn: homeData.shortName || homeData.name, nameHe: HEBREW_NAMES[homeData.tla] || homeData.shortName || homeData.name, flagUrl: homeData.crest },
        create: {
          nameEn: homeData.shortName || homeData.name,
          nameHe: HEBREW_NAMES[homeData.tla] || homeData.shortName || homeData.name,
          code: homeData.tla,
          flagUrl: homeData.crest,
        },
      })

      const awayTeam = await db.team.upsert({
        where: { code: awayData.tla },
        update: { nameEn: awayData.shortName || awayData.name, nameHe: HEBREW_NAMES[awayData.tla] || awayData.shortName || awayData.name, flagUrl: awayData.crest },
        create: {
          nameEn: awayData.shortName || awayData.name,
          nameHe: HEBREW_NAMES[awayData.tla] || awayData.shortName || awayData.name,
          code: awayData.tla,
          flagUrl: awayData.crest,
        },
      })

      const kickoffAt = new Date(m.utcDate)
      const idealLockAt = new Date(kickoffAt.getTime() - 60 * 60_000)
      const lockAt = idealLockAt < new Date() ? kickoffAt : idealLockAt

      await db.match.upsert({
        where: { providerMatchId: `fd-${m.id}` },
        update: { status: 'SCHEDULED', kickoffAt, lockAt },
        create: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt,
          lockAt,
          status: 'SCHEDULED',
          providerMatchId: `fd-${m.id}`,
          round: m.stage === 'GROUP_STAGE' ? `בית ${m.group?.replace('GROUP_', '') || ''}` : m.stage,
        },
      })
      inserted++
    }

    return NextResponse.json({ success: true, inserted, tournament: tournament.name })
  } catch (error: any) {
    console.error('WC migration error:', error?.response?.data || error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
