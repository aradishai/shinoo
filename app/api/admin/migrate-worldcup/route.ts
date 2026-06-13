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
  HTI: 'האיטי',
  CUW: 'קורסאו',
  SLV: 'אל סלבדור',
  CPV: 'כף ורדה',
  NZL: 'ניו זילנד',
  COD: 'קונגו',
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

    // Remove June 2026+ matches without providerMatchId (unlinked cleanup matches)
    await db.match.deleteMany({
      where: { kickoffAt: { gte: new Date('2026-06-01') }, providerMatchId: null },
    })

    // SQL dedup: remove matches where same two teams play on the same UTC date,
    // keeping the one with a providerMatchId (or the newest if both have one)
    await db.$executeRawUnsafe(`
      DELETE FROM "Match"
      WHERE id IN (
        SELECT id FROM (
          SELECT
            m.id,
            ROW_NUMBER() OVER (
              PARTITION BY
                LEAST(ht.code, at.code),
                GREATEST(ht.code, at.code),
                DATE(m."kickoffAt")
              ORDER BY
                (m."providerMatchId" IS NOT NULL) DESC,
                m.id DESC
            ) AS rn
          FROM "Match" m
          JOIN "Team" ht ON ht.id = m."homeTeamId"
          JOIN "Team" at ON at.id = m."awayTeamId"
          WHERE m."tournamentId" = '${tournament.id}'
        ) sub
        WHERE rn > 1
      )
    `)

    let inserted = 0
    let deduped = 0

    for (const m of matches) {
      const homeData = m.homeTeam
      const awayData = m.awayTeam
      if (!homeData?.tla || !awayData?.tla) continue

      const homeCode = NORM[homeData.tla] ?? homeData.tla
      const awayCode = NORM[awayData.tla] ?? awayData.tla

      const homeTeam = await db.team.upsert({
        where: { code: homeCode },
        update: {
          nameEn: homeData.shortName || homeData.name,
          nameHe: HEBREW_NAMES[homeData.tla] || homeData.shortName || homeData.name,
          flagUrl: homeData.crest,
        },
        create: {
          nameEn: homeData.shortName || homeData.name,
          nameHe: HEBREW_NAMES[homeData.tla] || homeData.shortName || homeData.name,
          code: homeCode,
          flagUrl: homeData.crest,
        },
      })

      const awayTeam = await db.team.upsert({
        where: { code: awayCode },
        update: {
          nameEn: awayData.shortName || awayData.name,
          nameHe: HEBREW_NAMES[awayData.tla] || awayData.shortName || awayData.name,
          flagUrl: awayData.crest,
        },
        create: {
          nameEn: awayData.shortName || awayData.name,
          nameHe: HEBREW_NAMES[awayData.tla] || awayData.shortName || awayData.name,
          code: awayCode,
          flagUrl: awayData.crest,
        },
      })

      const kickoffAt = new Date(m.utcDate)
      const idealLockAt = new Date(kickoffAt.getTime() - 60 * 60_000)
      const lockAt = idealLockAt < new Date() ? kickoffAt : idealLockAt
      const providerMatchId = `fd-${m.id}`

      // Dedup: delete any match involving these two teams on the same day, regardless of home/away order
      const kickoffFrom = new Date(kickoffAt.getTime() - 24 * 60 * 60_000)
      const kickoffTo = new Date(kickoffAt.getTime() + 24 * 60 * 60_000)
      const dups = await db.match.findMany({
        where: {
          tournamentId: tournament.id,
          kickoffAt: { gte: kickoffFrom, lte: kickoffTo },
          NOT: { providerMatchId },
          OR: [
            { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id },
            { homeTeamId: awayTeam.id, awayTeamId: homeTeam.id },
          ],
        },
      })
      for (const dup of dups) {
        await db.match.delete({ where: { id: dup.id } })
        deduped++
      }

      await db.match.upsert({
        where: { providerMatchId },
        update: { status: 'SCHEDULED', kickoffAt, lockAt },
        create: {
          tournamentId: tournament.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          kickoffAt,
          lockAt,
          status: 'SCHEDULED',
          providerMatchId,
          round: m.stage === 'GROUP_STAGE'
            ? `בית ${m.group?.replace('GROUP_', '') || ''}`
            : m.stage,
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
