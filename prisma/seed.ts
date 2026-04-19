import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import path from 'path'

const dbPath = process.env.DATABASE_PATH || path.resolve('./dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const db = new PrismaClient({ adapter } as any)

// ── 48 קבוצות אמיתיות מונדיאל 2026 ─────────────────────────────────────────
const TEAMS = [
  // Group A
  { nameHe: 'מקסיקו',           nameEn: 'Mexico',          code: 'MEX' },
  { nameHe: 'דרום אפריקה',       nameEn: 'South Africa',    code: 'RSA' },
  { nameHe: 'דרום קוריאה',       nameEn: 'South Korea',     code: 'KOR' },
  { nameHe: 'צ\'כיה',            nameEn: 'Czech Republic',  code: 'CZE' },
  // Group B
  { nameHe: 'קנדה',              nameEn: 'Canada',          code: 'CAN' },
  { nameHe: 'בוסניה והרצגובינה', nameEn: 'Bosnia & Herz.',  code: 'BIH' },
  { nameHe: 'קטאר',              nameEn: 'Qatar',           code: 'QAT' },
  { nameHe: 'שווייץ',            nameEn: 'Switzerland',     code: 'SUI' },
  // Group C
  { nameHe: 'האיטי',             nameEn: 'Haiti',           code: 'HAI' },
  { nameHe: 'סקוטלנד',           nameEn: 'Scotland',        code: 'SCO' },
  { nameHe: 'ברזיל',             nameEn: 'Brazil',          code: 'BRA' },
  { nameHe: 'מרוקו',             nameEn: 'Morocco',         code: 'MAR' },
  // Group D
  { nameHe: 'ארצות הברית',       nameEn: 'United States',   code: 'USA' },
  { nameHe: 'פרגוואי',           nameEn: 'Paraguay',        code: 'PAR' },
  { nameHe: 'אוסטרליה',          nameEn: 'Australia',       code: 'AUS' },
  { nameHe: 'טורקיה',            nameEn: 'Turkey',          code: 'TUR' },
  // Group E
  { nameHe: 'גרמניה',            nameEn: 'Germany',         code: 'GER' },
  { nameHe: 'קוראסאו',           nameEn: 'Curaçao',         code: 'CUW' },
  { nameHe: 'חוף השנהב',         nameEn: 'Ivory Coast',     code: 'CIV' },
  { nameHe: 'אקוודור',           nameEn: 'Ecuador',         code: 'ECU' },
  // Group F
  { nameHe: 'הולנד',             nameEn: 'Netherlands',     code: 'NED' },
  { nameHe: 'יפן',               nameEn: 'Japan',           code: 'JPN' },
  { nameHe: 'שוודיה',            nameEn: 'Sweden',          code: 'SWE' },
  { nameHe: 'תוניסיה',           nameEn: 'Tunisia',         code: 'TUN' },
  // Group G
  { nameHe: 'בלגיה',             nameEn: 'Belgium',         code: 'BEL' },
  { nameHe: 'מצרים',             nameEn: 'Egypt',           code: 'EGY' },
  { nameHe: 'אירן',              nameEn: 'Iran',            code: 'IRN' },
  { nameHe: 'ניו זילנד',         nameEn: 'New Zealand',     code: 'NZL' },
  // Group H
  { nameHe: 'ספרד',              nameEn: 'Spain',           code: 'ESP' },
  { nameHe: 'כף ורדה',           nameEn: 'Cape Verde',      code: 'CPV' },
  { nameHe: 'ערב הסעודית',       nameEn: 'Saudi Arabia',    code: 'SAU' },
  { nameHe: 'אורוגוואי',         nameEn: 'Uruguay',         code: 'URU' },
  // Group I
  { nameHe: 'צרפת',              nameEn: 'France',          code: 'FRA' },
  { nameHe: 'סנגל',              nameEn: 'Senegal',         code: 'SEN' },
  { nameHe: 'עיראק',             nameEn: 'Iraq',            code: 'IRQ' },
  { nameHe: 'נורווגיה',          nameEn: 'Norway',          code: 'NOR' },
  // Group J
  { nameHe: 'ארגנטינה',          nameEn: 'Argentina',       code: 'ARG' },
  { nameHe: 'אלג\'יריה',         nameEn: 'Algeria',         code: 'ALG' },
  { nameHe: 'אוסטריה',           nameEn: 'Austria',         code: 'AUT' },
  { nameHe: 'ירדן',              nameEn: 'Jordan',          code: 'JOR' },
  // Group K
  { nameHe: 'פורטוגל',           nameEn: 'Portugal',        code: 'POR' },
  { nameHe: 'קונגו הדמוקרטית',   nameEn: 'DR Congo',        code: 'COD' },
  { nameHe: 'אוזבקיסטן',         nameEn: 'Uzbekistan',      code: 'UZB' },
  { nameHe: 'קולומביה',          nameEn: 'Colombia',        code: 'COL' },
  // Group L
  { nameHe: 'אנגליה',            nameEn: 'England',         code: 'ENG' },
  { nameHe: 'קרואטיה',           nameEn: 'Croatia',         code: 'CRO' },
  { nameHe: 'גאנה',              nameEn: 'Ghana',           code: 'GHA' },
  { nameHe: 'פנמה',              nameEn: 'Panama',          code: 'PAN' },
]

// ── שחקנים ──────────────────────────────────────────────────────────────────
const PLAYERS: Record<string, { nameHe: string; nameEn: string }[]> = {
  ARG: [
    { nameHe: 'ליאו מסי',          nameEn: 'Lionel Messi' },
    { nameHe: 'חוליאן אלבארס',     nameEn: 'Julian Alvarez' },
    { nameHe: 'לאוטרו מרטינס',     nameEn: 'Lautaro Martinez' },
    { nameHe: 'פאולו דיבאלה',      nameEn: 'Paulo Dybala' },
  ],
  BRA: [
    { nameHe: 'וינישיוס ג\'וניור', nameEn: 'Vinicius Jr.' },
    { nameHe: 'ראפינייה',           nameEn: 'Raphinha' },
    { nameHe: 'רודריגו',            nameEn: 'Rodrigo' },
    { nameHe: 'גבריאל מרטינלי',    nameEn: 'Gabriel Martinelli' },
  ],
  FRA: [
    { nameHe: 'קיליאן מבאפה',      nameEn: 'Kylian Mbappe' },
    { nameHe: 'אנטואן גריזמן',     nameEn: 'Antoine Griezmann' },
    { nameHe: 'מרקוס תוראם',       nameEn: 'Marcus Thuram' },
    { nameHe: 'אוסמן דמבלה',       nameEn: 'Ousmane Dembele' },
  ],
  ENG: [
    { nameHe: 'הארי קיין',         nameEn: 'Harry Kane' },
    { nameHe: 'ג\'וד בלינגהאם',    nameEn: 'Jude Bellingham' },
    { nameHe: 'פיל פודן',          nameEn: 'Phil Foden' },
    { nameHe: 'בוקאיו סאקא',       nameEn: 'Bukayo Saka' },
  ],
  ESP: [
    { nameHe: 'לאמין ימאל',        nameEn: 'Lamine Yamal' },
    { nameHe: 'ניקו וויליאמס',     nameEn: 'Nico Williams' },
    { nameHe: 'דאני אולמו',        nameEn: 'Dani Olmo' },
    { nameHe: 'פאבי רואיז',        nameEn: 'Fabian Ruiz' },
  ],
  GER: [
    { nameHe: 'פלוריאן ווירץ',     nameEn: 'Florian Wirtz' },
    { nameHe: 'ג\'מאל מוסיאלה',    nameEn: 'Jamal Musiala' },
    { nameHe: 'קאי האברץ',         nameEn: 'Kai Havertz' },
    { nameHe: 'ניקלאס פולקרוג',    nameEn: 'Niclas Fullkrug' },
  ],
  POR: [
    { nameHe: 'כריסטיאנו רונאלדו', nameEn: 'Cristiano Ronaldo' },
    { nameHe: 'ברונו פרננדס',       nameEn: 'Bruno Fernandes' },
    { nameHe: 'ראפאל לאו',          nameEn: 'Rafael Leao' },
    { nameHe: 'ז\'ואאו פליקס',      nameEn: 'Joao Felix' },
  ],
  NED: [
    { nameHe: 'ווירג\'יל ון דייק',  nameEn: 'Virgil van Dijk' },
    { nameHe: 'קוודי גאקפו',        nameEn: 'Cody Gakpo' },
    { nameHe: 'ממפיס דפאי',         nameEn: 'Memphis Depay' },
    { nameHe: 'מאת\'יס דה ליכט',    nameEn: 'Matthijs de Ligt' },
  ],
  BEL: [
    { nameHe: 'קווין דה ברויינה',   nameEn: 'Kevin De Bruyne' },
    { nameHe: 'רומלו לוקאקו',       nameEn: 'Romelu Lukaku' },
    { nameHe: 'ז\'רמי דוקו',         nameEn: 'Jeremy Doku' },
    { nameHe: 'לואיס אופנדה',       nameEn: 'Loois Openda' },
  ],
  CRO: [
    { nameHe: 'לוקה מודריץ\'',      nameEn: 'Luka Modric' },
    { nameHe: 'מאטאו קובאצ\'יץ\'',  nameEn: 'Mateo Kovacic' },
    { nameHe: 'אנדרי קרמריץ\'',     nameEn: 'Andrej Kramaric' },
    { nameHe: 'איבן פריסיץ\'',      nameEn: 'Ivan Perisic' },
  ],
  MEX: [
    { nameHe: 'הירבינג לוזאנו',     nameEn: 'Hirving Lozano' },
    { nameHe: 'ראול חימנס',         nameEn: 'Raul Jimenez' },
    { nameHe: 'הנרי מרטין',         nameEn: 'Henry Martin' },
    { nameHe: 'אנתוני לוזאנו',      nameEn: 'Antony Lozano' },
  ],
  USA: [
    { nameHe: 'כריסטיאן פוליסיץ',  nameEn: 'Christian Pulisic' },
    { nameHe: 'ג\'ובאני ריינה',      nameEn: 'Giovanni Reyna' },
    { nameHe: 'פולארין בלוגון',      nameEn: 'Folarin Balogun' },
    { nameHe: 'טיילר אדאמס',        nameEn: 'Tyler Adams' },
  ],
  JPN: [
    { nameHe: 'טקפוסה קובו',        nameEn: 'Takefusa Kubo' },
    { nameHe: 'קאורו מיטומה',       nameEn: 'Kaoru Mitoma' },
    { nameHe: 'שוג\'י אוקאזאקי',    nameEn: 'Ritsu Doan' },
    { nameHe: 'הירוקי איטו',        nameEn: 'Hiroki Ito' },
  ],
  KOR: [
    { nameHe: 'סון הון-מין',        nameEn: 'Son Heung-min' },
    { nameHe: 'לי קאנג-אין',        nameEn: 'Lee Kang-in' },
    { nameHe: 'הוואנג הי-צ\'אן',     nameEn: 'Hwang Hee-chan' },
    { nameHe: 'לי ג\'אה-סונג',      nameEn: 'Lee Jae-sung' },
  ],
  SEN: [
    { nameHe: 'סאדיו מאנה',         nameEn: 'Sadio Mane' },
    { nameHe: 'יסמאילה סאר',        nameEn: 'Ismaila Sarr' },
    { nameHe: 'בולאיי דיה',         nameEn: 'Boulaye Dia' },
    { nameHe: 'פאפה גיאה',          nameEn: 'Pape Gueye' },
  ],
  MAR: [
    { nameHe: 'אכרף חקימי',         nameEn: 'Achraf Hakimi' },
    { nameHe: 'חאקים זיאך',         nameEn: 'Hakim Ziyech' },
    { nameHe: 'יוסף אנ-נסירי',      nameEn: 'Youssef En-Nesyri' },
    { nameHe: 'סופיאן בופאל',       nameEn: 'Soufiane Boufal' },
  ],
  URU: [
    { nameHe: 'דרווין נונס',         nameEn: 'Darwin Nunez' },
    { nameHe: 'פדריטו',              nameEn: 'Federico Valverde' },
    { nameHe: 'לוייס סואארס',        nameEn: 'Luis Suarez' },
    { nameHe: 'רודריגו בנטנקור',     nameEn: 'Rodrigo Bentancur' },
  ],
  COL: [
    { nameHe: 'לואיס דיאס',          nameEn: 'Luis Diaz' },
    { nameHe: 'חאמס רודריגס',        nameEn: 'James Rodriguez' },
    { nameHe: 'ראדאמל פאלקאו',       nameEn: 'Radamel Falcao' },
    { nameHe: 'חואן קואדראדו',        nameEn: 'Juan Cuadrado' },
  ],
}

// ── משחקי שלב הבתים האמיתיים (UTC) ──────────────────────────────────────────
// שעון ישראל = UTC+3 בקיץ
const MATCHES: { home: string; away: string; date: string; group: string }[] = [
  // ── בית א' ──
  { home: 'MEX', away: 'RSA', date: '2026-06-11T19:00:00Z', group: 'בית א\'' },
  { home: 'KOR', away: 'CZE', date: '2026-06-12T02:00:00Z', group: 'בית א\'' },
  { home: 'CZE', away: 'RSA', date: '2026-06-18T16:00:00Z', group: 'בית א\'' },
  { home: 'MEX', away: 'KOR', date: '2026-06-19T01:00:00Z', group: 'בית א\'' },
  { home: 'RSA', away: 'KOR', date: '2026-06-25T01:00:00Z', group: 'בית א\'' },
  { home: 'CZE', away: 'MEX', date: '2026-06-25T01:00:00Z', group: 'בית א\'' },

  // ── בית ב' ──
  { home: 'CAN', away: 'BIH', date: '2026-06-12T19:00:00Z', group: 'בית ב\'' },
  { home: 'QAT', away: 'SUI', date: '2026-06-13T19:00:00Z', group: 'בית ב\'' },
  { home: 'SUI', away: 'BIH', date: '2026-06-18T19:00:00Z', group: 'בית ב\'' },
  { home: 'CAN', away: 'QAT', date: '2026-06-18T22:00:00Z', group: 'בית ב\'' },
  { home: 'SUI', away: 'CAN', date: '2026-06-24T19:00:00Z', group: 'בית ב\'' },
  { home: 'BIH', away: 'QAT', date: '2026-06-24T19:00:00Z', group: 'בית ב\'' },

  // ── בית ג' ──
  { home: 'HAI', away: 'SCO', date: '2026-06-13T22:00:00Z', group: 'בית ג\'' },
  { home: 'BRA', away: 'MAR', date: '2026-06-14T20:00:00Z', group: 'בית ג\'' },
  { home: 'SCO', away: 'MAR', date: '2026-06-19T20:00:00Z', group: 'בית ג\'' },
  { home: 'BRA', away: 'HAI', date: '2026-06-20T00:30:00Z', group: 'בית ג\'' },
  { home: 'MAR', away: 'HAI', date: '2026-06-24T20:00:00Z', group: 'בית ג\'' },
  { home: 'SCO', away: 'BRA', date: '2026-06-24T20:00:00Z', group: 'בית ג\'' },

  // ── בית ד' ──
  { home: 'USA', away: 'PAR', date: '2026-06-13T01:00:00Z', group: 'בית ד\'' },
  { home: 'AUS', away: 'TUR', date: '2026-06-14T04:00:00Z', group: 'בית ד\'' },
  { home: 'USA', away: 'AUS', date: '2026-06-19T19:00:00Z', group: 'בית ד\'' },
  { home: 'TUR', away: 'PAR', date: '2026-06-20T03:00:00Z', group: 'בית ד\'' },
  { home: 'TUR', away: 'USA', date: '2026-06-26T02:00:00Z', group: 'בית ד\'' },
  { home: 'PAR', away: 'AUS', date: '2026-06-26T02:00:00Z', group: 'בית ד\'' },

  // ── בית ה' ──
  { home: 'GER', away: 'CUW', date: '2026-06-14T17:00:00Z', group: 'בית ה\'' },
  { home: 'CIV', away: 'ECU', date: '2026-06-14T23:00:00Z', group: 'בית ה\'' },
  { home: 'GER', away: 'CIV', date: '2026-06-20T20:00:00Z', group: 'בית ה\'' },
  { home: 'ECU', away: 'CUW', date: '2026-06-21T00:00:00Z', group: 'בית ה\'' },
  { home: 'CUW', away: 'CIV', date: '2026-06-25T20:00:00Z', group: 'בית ה\'' },
  { home: 'ECU', away: 'GER', date: '2026-06-25T20:00:00Z', group: 'בית ה\'' },

  // ── בית ו' ──
  { home: 'NED', away: 'JPN', date: '2026-06-14T20:00:00Z', group: 'בית ו\'' },
  { home: 'SWE', away: 'TUN', date: '2026-06-15T02:00:00Z', group: 'בית ו\'' },
  { home: 'NED', away: 'SWE', date: '2026-06-20T19:00:00Z', group: 'בית ו\'' },
  { home: 'TUN', away: 'JPN', date: '2026-06-21T04:00:00Z', group: 'בית ו\'' },
  { home: 'TUN', away: 'NED', date: '2026-06-25T23:00:00Z', group: 'בית ו\'' },
  { home: 'JPN', away: 'SWE', date: '2026-06-25T23:00:00Z', group: 'בית ו\'' },

  // ── בית ז' ──
  { home: 'BEL', away: 'EGY', date: '2026-06-15T19:00:00Z', group: 'בית ז\'' },
  { home: 'IRN', away: 'NZL', date: '2026-06-16T01:00:00Z', group: 'בית ז\'' },
  { home: 'BEL', away: 'IRN', date: '2026-06-21T19:00:00Z', group: 'בית ז\'' },
  { home: 'NZL', away: 'EGY', date: '2026-06-22T01:00:00Z', group: 'בית ז\'' },
  { home: 'NZL', away: 'BEL', date: '2026-06-27T03:00:00Z', group: 'בית ז\'' },
  { home: 'EGY', away: 'IRN', date: '2026-06-27T03:00:00Z', group: 'בית ז\'' },

  // ── בית ח' ──
  { home: 'ESP', away: 'CPV', date: '2026-06-15T16:00:00Z', group: 'בית ח\'' },
  { home: 'SAU', away: 'URU', date: '2026-06-15T20:00:00Z', group: 'בית ח\'' },
  { home: 'ESP', away: 'SAU', date: '2026-06-21T16:00:00Z', group: 'בית ח\'' },
  { home: 'URU', away: 'CPV', date: '2026-06-21T20:00:00Z', group: 'בית ח\'' },
  { home: 'CPV', away: 'SAU', date: '2026-06-27T00:00:00Z', group: 'בית ח\'' },
  { home: 'URU', away: 'ESP', date: '2026-06-27T00:00:00Z', group: 'בית ח\'' },

  // ── בית ט' ──
  { home: 'FRA', away: 'SEN', date: '2026-06-16T19:00:00Z', group: 'בית ט\'' },
  { home: 'IRQ', away: 'NOR', date: '2026-06-16T20:00:00Z', group: 'בית ט\'' },
  { home: 'FRA', away: 'IRQ', date: '2026-06-22T19:00:00Z', group: 'בית ט\'' },
  { home: 'NOR', away: 'SEN', date: '2026-06-23T00:00:00Z', group: 'בית ט\'' },
  { home: 'NOR', away: 'FRA', date: '2026-06-26T19:00:00Z', group: 'בית ט\'' },
  { home: 'SEN', away: 'IRQ', date: '2026-06-26T19:00:00Z', group: 'בית ט\'' },

  // ── בית י' ──
  { home: 'ARG', away: 'ALG', date: '2026-06-17T01:00:00Z', group: 'בית י\'' },
  { home: 'AUT', away: 'JOR', date: '2026-06-17T04:00:00Z', group: 'בית י\'' },
  { home: 'ARG', away: 'AUT', date: '2026-06-22T17:00:00Z', group: 'בית י\'' },
  { home: 'JOR', away: 'ALG', date: '2026-06-23T03:00:00Z', group: 'בית י\'' },
  { home: 'ARG', away: 'JOR', date: '2026-06-28T19:00:00Z', group: 'בית י\'' },
  { home: 'ALG', away: 'AUT', date: '2026-06-28T19:00:00Z', group: 'בית י\'' },

  // ── בית כ' ──
  { home: 'POR', away: 'COD', date: '2026-06-17T17:00:00Z', group: 'בית כ\'' },
  { home: 'UZB', away: 'COL', date: '2026-06-18T02:00:00Z', group: 'בית כ\'' },
  { home: 'POR', away: 'UZB', date: '2026-06-23T17:00:00Z', group: 'בית כ\'' },
  { home: 'COL', away: 'COD', date: '2026-06-24T02:00:00Z', group: 'בית כ\'' },
  { home: 'POR', away: 'COL', date: '2026-06-27T19:00:00Z', group: 'בית כ\'' },
  { home: 'COD', away: 'UZB', date: '2026-06-27T19:00:00Z', group: 'בית כ\'' },

  // ── בית ל' ──
  { home: 'ENG', away: 'CRO', date: '2026-06-17T20:00:00Z', group: 'בית ל\'' },
  { home: 'GHA', away: 'PAN', date: '2026-06-17T23:00:00Z', group: 'בית ל\'' },
  { home: 'ENG', away: 'GHA', date: '2026-06-23T20:00:00Z', group: 'בית ל\'' },
  { home: 'PAN', away: 'CRO', date: '2026-06-23T23:00:00Z', group: 'בית ל\'' },
  { home: 'PAN', away: 'ENG', date: '2026-06-27T21:00:00Z', group: 'בית ל\'' },
  { home: 'CRO', away: 'GHA', date: '2026-06-27T21:00:00Z', group: 'בית ל\'' },
]

async function main() {
  console.log('🌱 זורע נתונים...')

  const existing = await db.tournament.findFirst({ where: { slug: 'wc-2026' } })
  if (existing) {
    console.log('✅ כבר קיים טורניר — מדלג')
    return
  }

  const tournament = await db.tournament.create({
    data: { name: 'FIFA World Cup 2026', nameHe: 'מונדיאל 2026', slug: 'wc-2026', type: 'world_cup', isActive: true, season: '2026' },
  })

  const teamMap: Record<string, string> = {}
  for (const t of TEAMS) {
    const team = await db.team.create({ data: { nameHe: t.nameHe, nameEn: t.nameEn, code: t.code } })
    teamMap[t.code] = team.id
  }
  console.log(`✅ ${TEAMS.length} קבוצות`)

  let pc = 0
  for (const [code, players] of Object.entries(PLAYERS)) {
    if (!teamMap[code]) continue
    for (const p of players) {
      await db.player.create({ data: { ...p, teamId: teamMap[code] } })
      pc++
    }
  }
  console.log(`✅ ${pc} שחקנים`)

  let mc = 0
  for (const m of MATCHES) {
    if (!teamMap[m.home] || !teamMap[m.away]) {
      console.warn(`⚠️  קוד חסר: ${m.home} או ${m.away}`)
      continue
    }
    const kickoffAt = new Date(m.date)
    const lockAt = new Date(kickoffAt.getTime() - 3 * 60 * 60 * 1000)
    await db.match.create({
      data: { tournamentId: tournament.id, homeTeamId: teamMap[m.home], awayTeamId: teamMap[m.away], kickoffAt, lockAt, status: 'SCHEDULED', round: m.group },
    })
    mc++
  }
  console.log(`✅ ${mc} משחקים`)

  const hash1 = await bcrypt.hash('test1', 10)
  const hash2 = await bcrypt.hash('test2', 10)
  const hashErad = await bcrypt.hash('12345', 10)
  const user1 = await db.user.create({ data: { username: 'test1', passwordHash: hash1 } })
  const user2 = await db.user.create({ data: { username: 'test2', passwordHash: hash2 } })
  await db.user.create({ data: { username: 'ערד', passwordHash: hashErad } })
  console.log('✅ משתמשים')

  const league = await db.league.create({
    data: {
      name: 'ליגת הבדיקה',
      createdByUserId: user1.id,
      inviteCode: nanoid(8),
      tournamentId: tournament.id,
      members: { create: [{ userId: user1.id, role: 'ADMIN' }, { userId: user2.id, role: 'MEMBER' }] },
    },
  })
  console.log(`✅ ליגה: "${league.name}" | קוד: ${league.inviteCode}`)
  console.log('\n🎉 Seed הושלם! כניסה: ערד / 12345')
}

main().catch(e => { console.error('❌', e); process.exit(1) }).finally(() => db.$disconnect())
