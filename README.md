# SHINU! — ניחושי מונדיאל

אפליקציית ניחושי כדורגל לחברים עם מערכת נקודות, ליגות פרטיות ותמיכה מלאה בעברית.

## התקנה מהירה

### דרישות
- Node.js 18+
- PostgreSQL (מקומי או Supabase/Neon)

### שלבים

```bash
# 1. התקן חבילות
npm install

# 2. העתק קובץ סביבה
cp .env.example .env.local

# 3. ערוך .env.local — מלא DATABASE_URL ו-JWT_SECRET

# 4. צור את מסד הנתונים
npm run db:push

# 5. הכנס נתוני בדיקה
npm run db:seed

# 6. הפעל
npm run dev
```

פתח http://localhost:3000

### משתמשי בדיקה
- `test1` / `test1`
- `test2` / `test2`

## מערכת הניקוד

| תוצאה | נקודות |
|-------|--------|
| תוצאה מדויקת | 5 |
| מגמה נכונה + שערי קבוצה אחת | 3 |
| מגמה נכונה בלבד | 1 |
| מגמה שגויה | 0 |
| מלך שערים נכון | +2 |

## סנכרון נתונים (API-Football)

הגדר `FOOTBALL_API_KEY` ב-.env.local ואז:

```bash
npm run sync
```

או הפעל את endpoint הסנכרון:
```
POST /api/sync
Header: x-sync-secret: <SYNC_SECRET>
```

## מבנה הפרויקט

```
app/          — Next.js App Router (auth + app layouts)
components/   — רכיבי UI (MatchCard, LeagueTable וכו')
lib/          — לוגיקה עסקית (auth, scoring, sync)
prisma/       — schema + seed
types/        — TypeScript types
```
