import { db } from './db'
import axios from 'axios'

const FD_API = 'https://api.football-data.org/v4'

const NORM: Record<string, string> = { ESP: 'ESP-NT', KSA: 'SAU', URY: 'URU', CUR: 'CUW', HTI: 'HAI' }

const HEBREW_NAMES: Record<string, string> = {
  ARG: 'ארגנטינה', BRA: 'ברזיל', FRA: 'צרפת', ENG: 'אנגליה', ESP: 'ספרד',
  GER: 'גרמניה', POR: 'פורטוגל', NED: 'הולנד', BEL: 'בלגיה', ITA: 'איטליה',
  URU: 'אורוגוואי', URY: 'אורוגוואי', MEX: 'מקסיקו', USA: 'ארה"ב', CAN: 'קנדה',
  MAR: 'מרוקו', SEN: 'סנגל', NGA: 'ניגריה', CMR: 'קמרון', GHA: 'גאנה',
  CIV: "חוף השנהב", MLI: 'מאלי', EGY: 'מצרים', TUN: 'תוניסיה', ALG: "אלג'יריה",
  RSA: 'דרום אפריקה', KEN: 'קניה', JPN: 'יפן', KOR: 'קוריאה הדרומית', AUS: 'אוסטרליה',
  IRN: 'איראן', SAU: 'ערב הסעודית', KSA: 'ערב הסעודית', QAT: 'קטאר', IRQ: 'עיראק',
  JOR: 'ירדן', CHN: 'סין', IND: 'הודו', UZB: 'אוזבקיסטן', CRO: 'קרואטיה',
  SRB: 'סרביה', SUI: 'שוויץ', AUT: 'אוסטריה', DEN: 'דנמרק', SWE: 'שוודיה',
  NOR: 'נורווגיה', POL: 'פולין', CZE: "צ'כיה", HUN: 'הונגריה', ROU: 'רומניה',
  UKR: 'אוקראינה', TUR: 'טורקיה', GRE: 'יוון', SVK: 'סלובקיה', SVN: 'סלובניה',
  SCO: 'סקוטלנד', WAL: 'וולס', IRL: 'אירלנד', ECU: 'אקוודור', PER: 'פרו',
  CHL: "צ'ילה", VEN: 'ונצואלה', PAR: 'פרגוואי', BOL: 'בוליביה', COL: 'קולומביה',
  PAN: 'פנמה', CRC: 'קוסטה ריקה', HON: 'הונדורס', JAM: "ג'מייקה",
  TRI: 'טרינידד וטובגו', HTI: 'האיטי', CUW: 'קורסאו', CUR: 'קורסאו',
  SLV: 'אל סלבדור', CPV: 'כף ורדה', NZL: 'ניו זילנד', COD: 'קונגו',
  BIH: 'בוסניה-הרצגובינה', SLO: 'סלובניה',
}

const STAGE_NAMES: Record<string, string> = {
  LAST_32: 'שלב 32',
  LAST_16: 'שמינית גמר',
  QUARTER_FINALS: 'רבע גמר',
  SEMI_FINALS: 'חצי גמר',
  THIRD_PLACE: 'משחק גמר 3-4',
  FINAL: 'גמר',
}

const KNOCKOUT_STAGES = new Set(Object.keys(STAGE_NAMES))

const SLUG_MAP: Record<string, string> = {
  WC: 'world-cup-2026',
  PD: 'la-liga-2025-26',
  CL: 'champions-league',
}

export async function syncKnockoutMatches(
  competitionCode = 'WC'
): Promise<{ created: number; updated: number; skipped: number }> {
  const FD_KEY = process.env.FOOTBALL_DATA_API_KEY
  if (!FD_KEY) return { created: 0, updated: 0, skipped: 0 }

  const slug = SLUG_MAP[competitionCode]
  if (!slug) return { created: 0, updated: 0, skipped: 0 }

  const tournament = await db.tournament.findFirst({ where: { slug } })
  if (!tournament) return { created: 0, updated: 0, skipped: 0 }

  const res = await axios.get(`${FD_API}/competitions/${competitionCode}/matches`, {
    headers: { 'X-Auth-Token': FD_KEY },
    timeout: 10000,
  })

  const allMatches: any[] = res.data?.matches ?? []
  const knockouts = allMatches.filter(m => KNOCKOUT_STAGES.has(m.stage))

  let created = 0, updated = 0, skipped = 0

  for (const m of knockouts) {
    const homeData = m.homeTeam
    const awayData = m.awayTeam

    // Skip until teams are confirmed (FD returns null TLA for TBD slots)
    if (!homeData?.tla || !awayData?.tla) {
      skipped++
      continue
    }

    const homeCode = NORM[homeData.tla] ?? homeData.tla
    const awayCode = NORM[awayData.tla] ?? awayData.tla

    const homeTeam = await db.team.upsert({
      where: { code: homeCode },
      update: {
        nameEn: homeData.shortName || homeData.name,
        ...(HEBREW_NAMES[homeData.tla] ?? HEBREW_NAMES[homeCode]
          ? { nameHe: HEBREW_NAMES[homeData.tla] ?? HEBREW_NAMES[homeCode] }
          : {}),
        ...(homeData.crest ? { flagUrl: homeData.crest } : {}),
      },
      create: {
        nameEn: homeData.shortName || homeData.name,
        nameHe: HEBREW_NAMES[homeData.tla] ?? HEBREW_NAMES[homeCode] ?? homeData.shortName ?? homeData.name,
        code: homeCode,
        flagUrl: homeData.crest ?? null,
      },
    })

    const awayTeam = await db.team.upsert({
      where: { code: awayCode },
      update: {
        nameEn: awayData.shortName || awayData.name,
        ...(HEBREW_NAMES[awayData.tla] ?? HEBREW_NAMES[awayCode]
          ? { nameHe: HEBREW_NAMES[awayData.tla] ?? HEBREW_NAMES[awayCode] }
          : {}),
        ...(awayData.crest ? { flagUrl: awayData.crest } : {}),
      },
      create: {
        nameEn: awayData.shortName || awayData.name,
        nameHe: HEBREW_NAMES[awayData.tla] ?? HEBREW_NAMES[awayCode] ?? awayData.shortName ?? awayData.name,
        code: awayCode,
        flagUrl: awayData.crest ?? null,
      },
    })

    const kickoffAt = new Date(m.utcDate)
    const idealLockAt = new Date(kickoffAt.getTime() - 60 * 60_000)
    const lockAt = idealLockAt < new Date() ? kickoffAt : idealLockAt
    const providerMatchId = `fd-${m.id}`
    const round = STAGE_NAMES[m.stage] ?? m.stage

    const existing = await db.match.findUnique({ where: { providerMatchId } })

    if (existing) {
      const isActive = ['LIVE', 'PAUSED', 'FINISHED'].includes(existing.status)
      await db.match.update({
        where: { id: existing.id },
        data: {
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          round,
          // Only update schedule while match hasn't started yet
          ...(!isActive ? { kickoffAt, lockAt } : {}),
        },
      })
      updated++
    } else {
      await db.match.create({
        data: {
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
      created++
    }
  }

  return { created, updated, skipped }
}
