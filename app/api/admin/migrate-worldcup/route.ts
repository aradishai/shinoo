import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import axios from 'axios'

export const dynamic = 'force-dynamic'

const FD_API = 'https://api.football-data.org/v4'
const FD_KEY = process.env.FOOTBALL_DATA_API_KEY!

const NORM: Record<string, string> = { ESP: 'ESP-NT', KSA: 'SAU', URY: 'URU', CUR: 'CUW', HTI: 'HAI' }

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
  URY: 'אורוגוואי',
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
  KSA: 'ערב הסעודית',
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
  HTI: 'האיטי',
  CUW: 'קורסאו',
  CUR: 'קורסאו',
  SLV: 'אל סלבדור',
  CPV: 'כף ורדה',
  NZL: 'ניו זילנד',
  COD: 'קונגו',
  BIH: 'בוסניה-הרצגובינה',
  BIH_SHORT: 'בוסניה',
  SVK_FIXED: 'סלובקיה',
  SLO: 'סלובניה',
}

const STAGE_NAMES: Record<string, string> = {
  'LAST_32': 'שלב 32',
  'LAST_16': 'שמינית גמר',
  'QUARTER_FINALS': 'רבע גמר',
  'SEMI_FINALS': 'חצי גמר',
  'THIRD_PLACE': 'משחק גמר 3-4',
  'FINAL': 'גמר',
}

const GROUP_LETTERS: Record<string, string> = {
  A: "א'", B: "ב'", C: "ג'", D: "ד'",
  E: "ה'", F: "ו'", G: "ז'", H: "ח'",
  I: "ט'", J: "י'", K: "כ'", L: "ל'",
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

    // Remove unlinked matches (no providerMatchId, no predictions) from June 2026+
    const unlinked = await db.match.findMany({
      where: { kickoffAt: { gte: new Date('2026-06-01') }, providerMatchId: null },
      select: { id: true },
    })
    if (unlinked.length > 0) {
      const withPreds = await db.prediction.findMany({
        where: { matchId: { in: unlinked.map(m => m.id) } },
        select: { matchId: true },
        distinct: ['matchId'],
      })
      const predMatchIds = new Set(withPreds.map(p => p.matchId))
      const safeToDelete = unlinked.filter(m => !predMatchIds.has(m.id)).map(m => m.id)
      if (safeToDelete.length > 0) {
        await db.match.deleteMany({ where: { id: { in: safeToDelete } } })
      }
    }

    const apiProviderIds: string[] = []
    let inserted = 0
    let deduped = 0

    for (const m of matches) {
      const homeData = m.homeTeam
      const awayData = m.awayTeam
      if (!homeData?.tla || !awayData?.tla) continue

      const homeCode = NORM[homeData.tla] ?? homeData.tla
      const awayCode = NORM[awayData.tla] ?? awayData.tla

      const hebrewHome = HEBREW_NAMES[homeData.tla]
      const hebrewAway = HEBREW_NAMES[awayData.tla]

      const homeTeam = await db.team.upsert({
        where: { code: homeCode },
        update: {
          nameEn: homeData.shortName || homeData.name,
          // Only overwrite Hebrew name if we have a mapping — never overwrite with English
          ...(hebrewHome ? { nameHe: hebrewHome } : {}),
          flagUrl: homeData.crest,
        },
        create: {
          nameEn: homeData.shortName || homeData.name,
          nameHe: hebrewHome || homeData.shortName || homeData.name,
          code: homeCode,
          flagUrl: homeData.crest,
        },
      })

      const awayTeam = await db.team.upsert({
        where: { code: awayCode },
        update: {
          nameEn: awayData.shortName || awayData.name,
          ...(hebrewAway ? { nameHe: hebrewAway } : {}),
          flagUrl: awayData.crest,
        },
        create: {
          nameEn: awayData.shortName || awayData.name,
          nameHe: hebrewAway || awayData.shortName || awayData.name,
          code: awayCode,
          flagUrl: awayData.crest,
        },
      })

      const kickoffAt = new Date(m.utcDate)
      const idealLockAt = new Date(kickoffAt.getTime() - 60 * 60_000)
      const lockAt = idealLockAt < new Date() ? kickoffAt : idealLockAt
      const providerMatchId = `fd-${m.id}`
      apiProviderIds.push(providerMatchId)

      // In-loop dedup: find any existing match with same teams regardless of tournament
      const from = new Date(kickoffAt.getTime() - 48 * 60 * 60_000)
      const to = new Date(kickoffAt.getTime() + 48 * 60 * 60_000)
      const dups = await db.match.findMany({
        where: {
          kickoffAt: { gte: from, lte: to },
          OR: [
            { providerMatchId: null },
            { providerMatchId: { not: providerMatchId } },
          ],
          AND: [
            {
              OR: [
                { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
                { homeTeamId: awayTeam.id, awayTeamId: homeTeam.id },
              ],
            },
          ],
        },
      })
      for (const dup of dups) {
        const hasPreds = await db.prediction.count({ where: { matchId: dup.id } })
        if (hasPreds > 0) {
          // Has predictions — link this record to the correct providerMatchId instead of deleting it
          await db.match.update({
            where: { id: dup.id },
            data: { providerMatchId, kickoffAt, lockAt, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
          })
        } else {
          await db.match.delete({ where: { id: dup.id } })
        }
        deduped++
      }

      const groupLetter = m.group?.replace('GROUP_', '') || ''
      const round = m.stage === 'GROUP_STAGE'
        ? `בית ${GROUP_LETTERS[groupLetter] ?? groupLetter}`
        : STAGE_NAMES[m.stage] || m.stage

      await db.match.upsert({
        where: { providerMatchId },
        update: { status: 'SCHEDULED', kickoffAt, lockAt, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, round },
        create: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt,
          lockAt,
          status: 'SCHEDULED',
          providerMatchId,
          round,
        },
      })
      inserted++
    }

    return NextResponse.json({
      success: true,
      inserted,
      deduped,
      tournament: tournament.name,
    })
  } catch (error: any) {
    console.error('WC migration error:', error?.response?.data || error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
