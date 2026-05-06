'use client'

import { useState } from 'react'


const slides = [
  {
    emoji: null,
    logo: true,
    title: 'ברוכים הבאים לשינו!',
    body: 'תחרות ניחושי כדורגל עם החברים שלכם. נחשו, צברו נקודות, עלו בדירוג.',
  },
  {
    emoji: null,
    scoringDemo: true,
  },
  {
    emoji: null,
    leagueDemo: true,
    title: 'התחרו עם חברים',
    body: 'צרו ליגה, שלחו קוד הזמנה לחברים, והתחרו על המקום הראשון.',
  },
  {
    emoji: null,
    interestsSlide: true,
  },
  {
    emoji: null,
    marketIntro: true,
  },
  {
    emoji: null,
    powerupsDemo: true,
  },
]

const TELEGRAM_LINK = 'https://t.me/sportlaliga2020'

const LEAGUES = [
  'ליגת האלופות',
  'לה ליגה',
  'פרמייר ליג',
  'בונדסליגה',
  'סרייה א\'',
  'ליגת העל',
]

function InterestsSlide({ selected, onToggle }: { selected: Set<string>; onToggle: (l: string) => void }) {
  return (
    <div className="w-full flex flex-col gap-4 text-right">
      <div className="text-center">
        <p className="text-white font-bold text-base leading-relaxed">סמנו איזה מפעלים הכי מעניינים אתכם ועליהם תרצו להתחרות נגד חברים שלכם - אנחנו כבר נדאג שתקבלו אותם!</p>
      </div>

      <div className="space-y-2">
        {LEAGUES.map(league => {
          const on = selected.has(league)
          return (
            <button
              key={league}
              onClick={() => onToggle(league)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all active:scale-95 ${
                on ? 'bg-primary/10 border-primary/40' : 'bg-dark-card border-dark-border'
              }`}
            >
              <span className={`font-bold text-sm ${on ? 'text-white' : 'text-gray-300'}`}>{league}</span>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                on ? 'bg-primary border-primary' : 'border-gray-600'
              }`}>
                {on && <span className="text-black text-[11px] font-black leading-none">✓</span>}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="text-white font-black text-base text-center">רוצים לקבל עדכונים על הליגה הספרדית?</p>
        <p className="text-white font-bold text-xs text-center leading-relaxed">מידע על כל הקבוצות, סטטיסטיקות מיוחדות, העברות רשמיות, קטעי וידאו, הרכבים, סיכומי משחקים, תקצירים ועוד הרבה הפתעות.</p>
        <p className="text-[#229ED9] font-black text-base text-center">מוזמנים להצטרף לקהילה</p>
        <a
          href={TELEGRAM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-0 active:scale-95 transition-transform duration-150"
        >
          <img src="/laliga-logo.png" alt="LaLiga" className="h-32 w-auto" />
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#229ED9] shrink-0">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="text-white font-black text-sm">הצטרפו כאן</span>
          </div>
        </a>
      </div>
    </div>
  )
}

function MarketIntroSlide({ onNext: _ }: { onNext: () => void }) {
  return (
    <div className="w-full flex flex-col items-center text-center gap-8">
      <h2 className="text-white font-black text-3xl leading-snug">המרקט</h2>
      <p className="text-gray-200 text-lg leading-relaxed">
        במרקט תוכלו לקנות <span className="text-primary font-black">לחצנים מיוחדים</span> שיעזרו לכם לקבל יותר נקודות מהמשחקים.
        <br /><br />
        כל לחצן ניתן לקנות בעזרת <span className="text-yellow-400 font-black">מטבעות</span>.
      </p>
    </div>
  )
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0)
  const [interests, setInterests] = useState<Set<string>>(new Set())
  const slide = slides[current]
  const isLast = current === slides.length - 1

  const handleDone = async () => {
    if (interests.size > 0) {
      fetch('/api/user/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: Array.from(interests) }),
      }).catch(() => {})
    }
    onDone()
  }

  const toggleInterest = (league: string) => {
    setInterests(prev => {
      const next = new Set(prev)
      if (next.has(league)) next.delete(league)
      else next.add(league)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[100] bg-dark flex flex-col px-6 pt-10 pb-6" dir="rtl">
      {/* Skip */}
      <div className="flex justify-start mb-4 shrink-0">
        <button onClick={onDone} className="text-gray-600 text-sm">דלג</button>
      </div>

      {/* Slide content — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center text-center gap-4 pb-4">

          {slide.logo && (
            <img src="/shinoo-logo.png" alt="SHINOO" className="h-40 w-auto" style={{ mixBlendMode: 'lighten' }} />
          )}

          {(slide as any).scoringDemo && (
            <div className="w-full space-y-2 text-right">
              <h2 className="text-white font-black text-xl text-center mb-1">איך עובד הניקוד?</h2>
              <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-center">
                <p className="text-gray-400 text-xs mb-0.5">הניחוש שלכם</p>
                <p className="text-white font-black text-base">4:1 <span className="text-gray-400 font-normal text-sm">ברצלונה נגד ריאל מדריד</span></p>
              </div>
              {[
                { pts: '0 נקודות', color: 'text-gray-500', label: 'לא צדקתם במנצחת', sub: 'תיקו / ניצחון ריאל מדריד' },
                { pts: 'נקודה אחת', color: 'text-gray-300', label: 'צדקתם במנצחת בלבד', sub: '1:0 לברצלונה / 3:2 לברצלונה' },
                { pts: '3 נקודות', color: 'text-gray-300', label: 'מנצחת + קבוצה אחת', sub: '4:0 (פגעתם בברצלונה) / 2:1 (פגעתם בריאל)' },
                { pts: '5 נקודות 🎯', color: 'text-yellow-400', label: 'תוצאה מדויקת', sub: 'בדיוק 4:1 לברצלונה', highlight: true },
              ].map(({ pts, color, label, sub, highlight }) => (
                <div key={pts} className={`bg-dark-card border ${highlight ? 'border-primary/40' : 'border-dark-border'} rounded-xl px-4 py-2.5`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${color} font-black text-sm`}>{pts}</span>
                    <span className="text-gray-300 text-xs">{label}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{sub}</p>
                </div>
              ))}
              <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-gray-500">🤝</span>
                <div className="text-right">
                  <p className="text-gray-300 text-xs font-bold">ניחוש תיקו</p>
                  <p className="text-gray-500 text-xs">תיקו לא מדויק = 2 נקודות · תיקו מדויק = 5</p>
                </div>
              </div>
            </div>
          )}

          {(slide as any).marketIntro && (
            <MarketIntroSlide onNext={() => setCurrent(c => c + 1)} />
          )}

          {(slide as any).interestsSlide && <InterestsSlide selected={interests} onToggle={toggleInterest} />}

          {(slide as any).powerupsDemo && (
            <div className="w-full space-y-2.5 text-right">
              <h2 className="text-white font-black text-xl text-center">המרקט</h2>

              <p className="text-gray-500 text-[11px] font-bold">לפני המשחק</p>
              {[
                { img: '/btn-x3.png', desc: 'שלש את הניקוד', cost: 4 },
                { img: '/btn-goals.png', desc: 'כל גול שווה נקודה', cost: 3 },
                { img: '/btn-split.png', desc: 'נחש 2 תוצאות, וקבל ניקוד על הטובה מבניהן', cost: 2 },
              ].map(({ img, desc, cost }) => (
                <div key={img} className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 flex items-center gap-3">
                  <img src={img} className="h-8 w-20 object-contain object-right rounded-lg shrink-0" style={{ mixBlendMode: 'lighten' }} />
                  <p className="text-gray-300 text-xs leading-snug flex-1">{desc}</p>
                  <span className="text-yellow-400 font-black text-xs shrink-0">{cost}🪙</span>
                </div>
              ))}

              <p className="text-gray-500 text-[11px] font-bold pt-1">במהלך המשחק</p>
              {[
                { img: '/btn-x2.png', desc: 'הכפל ניקוד — בזמן המחצית', cost: 3 },
                { img: '/btn-shinoo.png', desc: 'שנה גול אחד — בזמן המחצית', cost: 2 },
                { img: '/btn-90.png', desc: 'הגרל ניחוש חדש — עד דקה 90', cost: 1 },
              ].map(({ img, desc, cost }) => (
                <div key={img} className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 flex items-center gap-3">
                  <img src={img} className="h-8 w-20 object-contain object-right rounded-lg shrink-0" style={{ mixBlendMode: 'lighten' }} />
                  <p className="text-gray-300 text-xs leading-snug flex-1">{desc}</p>
                  <span className="text-yellow-400 font-black text-xs shrink-0">{cost}🪙</span>
                </div>
              ))}

              <div className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 space-y-1 pt-2.5">
                <p className="text-gray-500 text-xs font-bold mb-1">חוקים חשובים</p>
                <p className="text-gray-400 text-xs">• לחצן אחד בלבד לכל משחק</p>
                <p className="text-gray-400 text-xs">• רכישה רק עם מטבעות</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5">
                <p className="text-yellow-400 font-black text-xs mb-1">🪙 איך מרוויחים מטבעות?</p>
                <p className="text-gray-300 text-xs">• הרשמה לאפליקציה — <span className="text-yellow-400 font-bold">4 מטבעות</span></p>
                <p className="text-gray-300 text-xs">• כל משחק שניחשתם — <span className="text-yellow-400 font-bold">מטבע 1</span> בסיומו</p>
              </div>
            </div>
          )}

          {(slide as any).leagueDemo && (
            <div className="w-full space-y-3 mt-2">
              <div>
                <p className="text-gray-500 text-xs mb-1.5 text-right">① לחצו על "צור ליגה חדשה"</p>
                <div className="bg-dark-card border border-primary/30 rounded-2xl p-4 text-center">
                  <p className="text-white font-bold text-sm">צור ליגה חדשה</p>
                  <p className="text-gray-500 text-xs mt-0.5">הזמן חברים ותתחרו ביניכם</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1.5 text-right">② שתפו את קוד ההזמנה</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 flex items-center justify-between">
                  <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-1.5">
                    <span className="text-primary font-black text-sm tracking-widest">AB12CD34</span>
                  </div>
                  <span className="text-gray-500 text-xs">קוד הזמנה</span>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1.5 text-right">③ החברים מצטרפים עם הקוד</p>
                <div className="bg-dark-card border border-dark-border rounded-2xl p-3 flex gap-2">
                  <div className="bg-primary rounded-xl px-4 py-2 text-black font-bold text-sm">הצטרף</div>
                  <div className="flex-1 bg-dark-50 border border-dark-border rounded-xl px-3 py-2 text-gray-600 text-sm text-right">קוד הזמנה...</div>
                </div>
              </div>
            </div>
          )}

          {slide.title && (
            <h2 className="text-white font-black text-2xl mt-2">{slide.title}</h2>
          )}
          {slide.body && (
            <p className="text-gray-400 text-sm leading-relaxed">{slide.body}</p>
          )}
        </div>
      </div>

      {/* Dots + buttons — always visible at bottom */}
      <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto shrink-0 pt-3">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-dark-border'}`}
              />
            ))}
          </div>
          <div className="flex gap-3 w-full">
            {current > 0 && (
              <button
                onClick={() => setCurrent(c => c - 1)}
                className="bg-dark-card border border-dark-border text-gray-300 font-bold text-lg py-4 px-6 rounded-2xl active:scale-95 transition-all"
              >
                הקודם
              </button>
            )}
            <button
              onClick={() => isLast ? handleDone() : setCurrent(c => c + 1)}
              className="flex-1 bg-primary text-black font-black text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-green"
            >
              {isLast ? 'בואו נתחיל!' : 'הבא'}
            </button>
          </div>
        </div>
    </div>
  )
}
