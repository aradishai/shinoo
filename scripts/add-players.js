/**
 * מוסיף שחקנים לכל 48 קבוצות מונדיאל 2026
 * מריץ על בסיס הנתונים הקיים - לא מוחק כלום
 */
const Database = require('better-sqlite3')
const path = require('path')
const { randomBytes } = require('crypto')

const nanoid = (size = 21) => randomBytes(size).toString('base64url').slice(0, size)
const db = new Database(path.resolve('./dev.db'))

const PLAYERS = {
  // קבוצות שכבר יש להן שחקנים - לא ניגע בהן
  // מוסיפים רק את החסרות

  RSA: [
    { nameHe: 'פרסי טאו',          nameEn: 'Percy Tau' },
    { nameHe: 'ליל פוסטר',         nameEn: 'Lyle Foster' },
    { nameHe: 'בונגאני זונגו',      nameEn: 'Bongani Zungu' },
    { nameHe: 'תמבה יאקיני',        nameEn: 'Themba Zwane' },
  ],
  CZE: [
    { nameHe: 'פאטריק שיק',         nameEn: 'Patrik Schick' },
    { nameHe: 'תומאש סאוצ\'ק',      nameEn: 'Tomas Soucek' },
    { nameHe: 'ולדימיר קאופל',      nameEn: 'Vladimir Coufal' },
    { nameHe: 'אנטונין בראק',       nameEn: 'Antonin Barak' },
  ],
  CAN: [
    { nameHe: 'אלפונסו דיוויס',     nameEn: 'Alphonso Davies' },
    { nameHe: 'ג\'ונתן דיוויד',      nameEn: 'Jonathan David' },
    { nameHe: 'טאג\'ון בוקנן',       nameEn: 'Tajon Buchanan' },
    { nameHe: 'סייל לארין',          nameEn: 'Cyle Larin' },
  ],
  BIH: [
    { nameHe: 'אדין ז\'קו',          nameEn: 'Edin Dzeko' },
    { nameHe: 'מירלם פיאניץ\'',      nameEn: 'Miralem Pjanic' },
    { nameHe: 'סעד קולאשינץ\'',      nameEn: 'Sead Kolasinac' },
    { nameHe: 'הריס סברביץ\'',       nameEn: 'Haris Seferovic' },
  ],
  QAT: [
    { nameHe: 'אכרם עפיף',          nameEn: 'Akram Afif' },
    { nameHe: 'אלמועז עלי',         nameEn: 'Almoez Ali' },
    { nameHe: 'חסן אל-חידוס',       nameEn: 'Hassan Al-Haydos' },
    { nameHe: 'מוחמד מונתרי',       nameEn: 'Mohammed Muntari' },
  ],
  SUI: [
    { nameHe: 'שרדאן שאקירי',       nameEn: 'Xherdan Shaqiri' },
    { nameHe: 'גראניט ז\'קה',        nameEn: 'Granit Xhaka' },
    { nameHe: 'ברל אמבולו',         nameEn: 'Breel Embolo' },
    { nameHe: 'רמו פרוילר',         nameEn: 'Remo Freuler' },
  ],
  HAI: [
    { nameHe: 'פרנצ\'די פיירו',      nameEn: 'Frantzdy Pierrot' },
    { nameHe: 'דריק אטיין',         nameEn: 'Derrick Etienne' },
    { nameHe: 'דאקנס נאזון',        nameEn: 'Duckens Nazon' },
    { nameHe: 'קלינסון אוליביה',    nameEn: 'Klinsman Olivia' },
  ],
  SCO: [
    { nameHe: 'אנדי רוברטסון',      nameEn: 'Andy Robertson' },
    { nameHe: 'סקוט מקטומינאי',     nameEn: 'Scott McTominay' },
    { nameHe: 'צ\'ה אדאמס',          nameEn: 'Che Adams' },
    { nameHe: 'ריאן כריסטי',        nameEn: 'Ryan Christie' },
  ],
  PAR: [
    { nameHe: 'מיגל אלמירון',       nameEn: 'Miguel Almiron' },
    { nameHe: 'חוליו אנסיסו',       nameEn: 'Julio Enciso' },
    { nameHe: 'גוסטבו גומס',        nameEn: 'Gustavo Gomez' },
    { nameHe: 'אנחל רומרו',         nameEn: 'Angel Romero' },
  ],
  AUS: [
    { nameHe: 'מת\'יו לקי',         nameEn: 'Mathew Leckie' },
    { nameHe: 'מיטצ\'ל דיוק',       nameEn: 'Mitchell Duke' },
    { nameHe: 'מרטין בויל',         nameEn: 'Martin Boyle' },
    { nameHe: 'ריילי מקגרי',        nameEn: 'Riley McGree' },
  ],
  TUR: [
    { nameHe: 'האקאן צ\'אלחנוגלו',  nameEn: 'Hakan Calhanoglu' },
    { nameHe: 'ארדה גולר',          nameEn: 'Arda Guler' },
    { nameHe: 'קרם אקטורקאוגלו',   nameEn: 'Kerem Akturkoglu' },
    { nameHe: 'יוסוף יאזיצ\'י',     nameEn: 'Yusuf Yazici' },
  ],
  CUW: [
    { nameHe: 'קוקו מרטינה',        nameEn: 'Cuco Martina' },
    { nameHe: 'ג\'ארצ\'יניו אנטוניה', nameEn: 'Jarchinio Antonia' },
    { nameHe: 'לאנדרו בקונה',       nameEn: 'Leandro Bacuna' },
    { nameHe: 'טריסטן דו קוניה',    nameEn: 'Tristan Do Couto' },
  ],
  CIV: [
    { nameHe: 'סבסטיאן האלר',       nameEn: 'Sebastien Haller' },
    { nameHe: 'ניקולא פיפה',        nameEn: 'Nicolas Pepe' },
    { nameHe: 'פרנק קסיה',          nameEn: 'Franck Kessie' },
    { nameHe: 'מקס-אלן גרדל',       nameEn: 'Max-Alain Gradel' },
  ],
  ECU: [
    { nameHe: 'אנר ולנסיה',         nameEn: 'Enner Valencia' },
    { nameHe: 'מויסס קאיסדו',       nameEn: 'Moises Caicedo' },
    { nameHe: 'פרביס אסטופיניאן',   nameEn: 'Pervis Estupinan' },
    { nameHe: 'ג\'רמי סרמיינטו',    nameEn: 'Jeremy Sarmiento' },
  ],
  SWE: [
    { nameHe: 'אלכסנדר איסאק',      nameEn: 'Alexander Isak' },
    { nameHe: 'דיאן קולושבסקי',     nameEn: 'Dejan Kulusevski' },
    { nameHe: 'ויקטור לינדלוף',     nameEn: 'Victor Lindelof' },
    { nameHe: 'אמיל פורסברג',       nameEn: 'Emil Forsberg' },
  ],
  TUN: [
    { nameHe: 'הנאניבאל מג\'ברי',   nameEn: 'Hannibal Mejbri' },
    { nameHe: 'אליס סכירי',         nameEn: 'Ellyes Skhiri' },
    { nameHe: 'ואהבי חאזרי',        nameEn: 'Wahbi Khazri' },
    { nameHe: 'יוסוף מסאכני',       nameEn: 'Youssef Msakni' },
  ],
  EGY: [
    { nameHe: 'מוחמד סאלח',         nameEn: 'Mohamed Salah' },
    { nameHe: 'עומר מרמוש',         nameEn: 'Omar Marmoush' },
    { nameHe: 'מוסטפה מוחמד',       nameEn: 'Mostafa Mohamed' },
    { nameHe: 'רמדאן סובחי',        nameEn: 'Ramadan Sobhi' },
  ],
  IRN: [
    { nameHe: 'מהדי תארמי',         nameEn: 'Mehdi Taremi' },
    { nameHe: 'סרדאר אזמון',        nameEn: 'Sardar Azmoun' },
    { nameHe: 'אלירזה ג\'אהנבחש',   nameEn: 'Alireza Jahanbakhsh' },
    { nameHe: 'שג\'אע חוסיין-פור',  nameEn: 'Shojae Khalilzadeh' },
  ],
  NZL: [
    { nameHe: 'כריס וואוד',         nameEn: 'Chris Wood' },
    { nameHe: 'קלייטון לואיס',      nameEn: 'Clayton Lewis' },
    { nameHe: 'ליברטו קקאצ\'ה',     nameEn: 'Liberato Cacace' },
    { nameHe: 'ג\'ו בל',             nameEn: 'Joe Bell' },
  ],
  CPV: [
    { nameHe: 'גארי רודריגס',       nameEn: 'Garry Rodrigues' },
    { nameHe: 'חוליו טאוארס',       nameEn: 'Julio Tavares' },
    { nameHe: 'ריאן מנדס',          nameEn: 'Ryan Mendes' },
    { nameHe: 'סטיבן פורטס',        nameEn: 'Steven Fortes' },
  ],
  SAU: [
    { nameHe: 'סאלם אל-דאוסרי',    nameEn: 'Salem Al-Dawsari' },
    { nameHe: 'מוחמד אל-שהרי',     nameEn: 'Mohammed Al-Shehri' },
    { nameHe: 'פירס אל-בוראיכן',   nameEn: 'Firas Al-Buraikan' },
    { nameHe: 'עבדולרחמן גרירי',    nameEn: 'Abdulrahman Ghareeb' },
  ],
  IRQ: [
    { nameHe: 'איימן חוסיין',       nameEn: 'Aimen Hussein' },
    { nameHe: 'עלי עדנאן',          nameEn: 'Ali Adnan' },
    { nameHe: 'עמג\'אד ראשיד',      nameEn: 'Amjad Rasheed' },
    { nameHe: 'מוחמד עמין',         nameEn: 'Mohanad Ali' },
  ],
  NOR: [
    { nameHe: 'ארלינג הולאנד',      nameEn: 'Erling Haaland' },
    { nameHe: 'מרטין אודגור',       nameEn: 'Martin Odegaard' },
    { nameHe: 'אלכסנדר סורלות',    nameEn: 'Alexander Sorloth' },
    { nameHe: 'סנדר ברגה',          nameEn: 'Sander Berge' },
  ],
  ALG: [
    { nameHe: 'ריאד מחרז',          nameEn: 'Riyad Mahrez' },
    { nameHe: 'יוסף עטאל',          nameEn: 'Youcef Atal' },
    { nameHe: 'סעיד בנרחמה',        nameEn: 'Said Benrahma' },
    { nameHe: 'בגדד בוניג\'א',       nameEn: 'Baghdad Bounedjah' },
  ],
  AUT: [
    { nameHe: 'דיוויד אלאבא',       nameEn: 'David Alaba' },
    { nameHe: 'מרסל זביצר',         nameEn: 'Marcel Sabitzer' },
    { nameHe: 'מרקו ארנאוטוביץ\'',  nameEn: 'Marko Arnautovic' },
    { nameHe: 'קונראד לאימר',       nameEn: 'Konrad Laimer' },
  ],
  JOR: [
    { nameHe: 'יאזן אל-ניימאט',    nameEn: 'Yazan Al-Naimat' },
    { nameHe: 'מוסא אל-תאמרי',     nameEn: 'Mousa Al-Taamari' },
    { nameHe: 'עומר אל-דאמס',       nameEn: 'Ahmad Al-Sarori' },
    { nameHe: 'בהאא פייסל',         nameEn: 'Baha Faisal' },
  ],
  COD: [
    { nameHe: 'סדריק בקמבו',        nameEn: 'Cedric Bakambu' },
    { nameHe: 'יאניק בולאסי',       nameEn: 'Yannick Bolasie' },
    { nameHe: 'שנסל מבמבה',         nameEn: 'Chancel Mbemba' },
    { nameHe: 'פול-חוסה אמפומה',    nameEn: 'Paul-Jose Mpoku' },
  ],
  UZB: [
    { nameHe: 'אלדור שומורודוב',    nameEn: 'Eldor Shomurodov' },
    { nameHe: 'אבוסבק פייזולאיב',  nameEn: 'Abbosbek Fayzullaev' },
    { nameHe: 'ג\'אלולידין משריפוב', nameEn: 'Jaloliddin Masharipov' },
    { nameHe: 'עותובק שוקורוב',     nameEn: 'Otabek Shukurov' },
  ],
  GHA: [
    { nameHe: 'תומאס פרטי',         nameEn: 'Thomas Partey' },
    { nameHe: 'מוחמד קודוס',        nameEn: 'Mohammed Kudus' },
    { nameHe: 'ג\'ורדן איו',         nameEn: 'Jordan Ayew' },
    { nameHe: 'אנטואן סמנה',        nameEn: 'Antoine Semenyo' },
  ],
  PAN: [
    { nameHe: 'רומל קינונס',        nameEn: 'Rommel Quinones' },
    { nameHe: 'סיסיליו ווטרמן',     nameEn: 'Cecilio Waterman' },
    { nameHe: 'אבדיל ארויו',        nameEn: 'Abdiel Arroyo' },
    { nameHe: 'אדולפו מצ\'אדו',     nameEn: 'Adolfo Machado' },
  ],
}

// קבוצות שכבר יש להן שחקנים - נדלג עליהן
const ALREADY_HAVE = ['ARG','BRA','FRA','ENG','ESP','GER','POR','NED','BEL','CRO','MEX','USA','JPN','KOR','SEN','MAR','URU','COL']

const insertPlayer = db.prepare(
  `INSERT OR IGNORE INTO Player (id, teamId, nameHe, nameEn)
   VALUES (?, ?, ?, ?)`
)

const getTeam = db.prepare(`SELECT id FROM Team WHERE code = ?`)

let added = 0
let skipped = 0

db.transaction(() => {
  for (const [code, players] of Object.entries(PLAYERS)) {
    if (ALREADY_HAVE.includes(code)) {
      skipped++
      continue
    }

    const team = getTeam.get(code)
    if (!team) {
      console.log(`⚠️  קבוצה לא נמצאה: ${code}`)
      continue
    }

    for (const p of players) {
      const id = nanoid()
      insertPlayer.run(id, team.id, p.nameHe, p.nameEn)

      added++
    }
    console.log(`✅ ${code} — ${players.length} שחקנים`)
  }
})()

console.log(`\nסה"כ: ${added} שחקנים נוספו, ${skipped} קבוצות דולגו (כבר יש)`)
db.close()
