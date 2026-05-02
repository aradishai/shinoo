'use client'

import { useState, useEffect } from 'react'

const slides = [
  {
    emoji: null,
    logo: true,
    title: 'ברוך הבא לשינו!',
    body: 'תחרות ניחושי כדורגל עם החברים שלך. נחש, צבור נקודות, עלה בדירוג.',
  },
  {
    emoji: null,
    scoringDemo: true,
  },
  {
    emoji: null,
    leagueDemo: true,
    title: 'התחרו עם חברים',
    body: 'צור ליגה, שלח קוד הזמנה לחברים, והתחרו על המקום הראשון.',
  },
  {
    emoji: null,
    powerupsDemo: true,
  },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0)
  const slide = slides[current]
  const isLast = current === slides.length - 1

  return (
    <div className="fixed inset-0 z-[100] bg-dark flex flex-col px-6 pt-14 pb-10" dir="rtl">
      {/* Skip */}
      <div className="flex justify-start mb-6">
        <button onClick={onDone} className="text-gray-600 text-sm">דלג</button>
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center text-center gap-5 flex-1 w-full max-w-xs mx-auto">
        {slide.logo && (
          <img src="/shinoo-title.png" alt="SHINOO" className="h-36 w-auto" style={{ mixBlendMode: 'lighten' }} />
        )}
        {slide.emoji && (
          <div className="text-7xl mt-4">{slide.emoji}</div>
        )}

        {(slide as any).scoringDemo && (
          <div className="w-full space-y-2.5 text-right">
            <h2 className="text-white font-black text-xl text-center mb-1">איך עובד הניקוד?</h2>
            {/* Prediction example */}
            <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-center">
              <p className="text-gray-400 text-xs mb-1">הניחוש שלך</p>
              <p className="text-white font-black text-lg">4:1 <span className="text-gray-400 font-normal text-sm">לברצלונה נגד ריאל מדריד</span></p>
            </div>
            {/* 0 points */}
            <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-500 font-black text-base">0 נקודות</span>
                <span className="text-gray-300 text-sm">לא צדקת במנצחת</span>
              </div>
              <p className="text-gray-400 text-xs">תיקו / ניצחון ריאל מדריד</p>
            </div>
            {/* 1 point */}
            <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-gray-300 font-black text-base">נקודה אחת</span>
                <span className="text-gray-300 text-sm">צדקת במנצחת בלבד</span>
              </div>
              <p className="text-gray-400 text-xs">1:0 לברצלונה / 3:2 לברצלונה</p>
            </div>
            {/* 3 points */}
            <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-yellow-400 font-black text-base">3 נקודות</span>
                <span className="text-gray-300 text-sm">מנצחת + קבוצה אחת</span>
              </div>
              <p className="text-gray-400 text-xs">4:0 (פגעת בברצלונה) / 2:1 (פגעת בריאל)</p>
            </div>
            {/* 5 points */}
            <div className="bg-dark-card border border-primary/40 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-primary font-black text-base">5 נקודות 🎯</span>
                <span className="text-gray-300 text-sm">תוצאה מדויקת</span>
              </div>
              <p className="text-gray-400 text-xs">בדיוק 4:1 לברצלונה</p>
            </div>
            {/* Draw note */}
            <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-gray-500 text-lg">🤝</span>
              <div>
                <p className="text-gray-300 text-xs font-bold">ניחוש תיקו</p>
                <p className="text-gray-400 text-xs">תיקו לא מדויק = 2 נקודות &nbsp;·&nbsp; תיקו מדויק = 5</p>
              </div>
            </div>
          </div>
        )}

        {(slide as any).powerupsDemo && (
          <div className="w-full space-y-3 text-right">
            <h2 className="text-white font-black text-xl text-center">לחצנים מיוחדים</h2>

            {/* Coins earn */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5">
              <p className="text-yellow-400 font-black text-xs mb-1">🪙 איך מרוויחים מטבעות?</p>
              <div className="space-y-0.5">
                <p className="text-gray-300 text-xs">• הצטרפות לליגה — <span className="text-yellow-400 font-bold">4 מטבעות</span></p>
                <p className="text-gray-300 text-xs">• כל משחק שניחשת — <span className="text-yellow-400 font-bold">מטבע 1</span> בסיומו</p>
              </div>
            </div>

            {/* Pre-match */}
            <p className="text-gray-500 text-[11px] font-bold">לפני המשחק</p>
            <div className="space-y-2">
              {[
                { img: '/btn-x3.jpg', desc: 'שלש את הניקוד', cost: 4 },
                { img: '/btn-goals.jpg', desc: 'כל גול שווה נקודה', cost: 3 },
                { img: '/btn-split.jpg', desc: 'נחש 2 תוצאות, המערכת בוחרת הטובה', cost: 2 },
              ].map(({ img, desc, cost }) => (
                <div key={img} className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 flex items-center gap-3">
                  <img src={img} className="h-8 w-20 object-contain object-right rounded-lg shrink-0" style={{ mixBlendMode: 'lighten' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs leading-snug">{desc}</p>
                  </div>
                  <span className="text-yellow-400 font-black text-xs shrink-0">{cost}🪙</span>
                </div>
              ))}
            </div>

            {/* In-match */}
            <p className="text-gray-500 text-[11px] font-bold">במהלך המשחק</p>
            <div className="space-y-2">
              {[
                { img: '/btn-x2.png', desc: 'הכפל ניקוד — בזמן המחצית', cost: 3 },
                { img: '/btn-shinoo.png', desc: 'שנה גול אחד — בזמן המחצית', cost: 2 },
                { img: '/btn-90.jpg', desc: 'הגרל ניחוש חדש — עד דקה 90', cost: 2 },
              ].map(({ img, desc, cost }) => (
                <div key={img} className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 flex items-center gap-3">
                  <img src={img} className="h-8 w-20 object-contain object-right rounded-lg shrink-0" style={{ mixBlendMode: 'lighten' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs leading-snug">{desc}</p>
                  </div>
                  <span className="text-yellow-400 font-black text-xs shrink-0">{cost}🪙</span>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
              <p className="text-gray-300 text-xs">לחצן אחד בלבד לכל משחק &nbsp;·&nbsp; כל הלחצנים נרכשים <span className="text-primary font-bold">במרקט</span> עם המטבעות שצברת</p>
            </div>
          </div>
        )}

        {(slide as any).leagueDemo && (
          <div className="w-full space-y-3 mt-2">
            {/* Create league button mockup */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5 text-right">① לחץ על "צור ליגה חדשה"</p>
              <div className="bg-dark-card border border-primary/30 rounded-2xl p-4 text-center">
                <p className="text-white font-bold text-sm">צור ליגה חדשה</p>
                <p className="text-gray-500 text-xs mt-0.5">הזמן חברים ותתחרו ביניכם</p>
              </div>
            </div>
            {/* Invite code mockup */}
            <div>
              <p className="text-gray-500 text-xs mb-1.5 text-right">② שתף את קוד ההזמנה</p>
              <div className="bg-dark-card border border-dark-border rounded-2xl p-4 flex items-center justify-between">
                <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-1.5">
                  <span className="text-primary font-black text-sm tracking-widest">AB12CD34</span>
                </div>
                <span className="text-gray-500 text-xs">קוד הזמנה</span>
              </div>
            </div>
            {/* Join mockup */}
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

      {/* Dots + button */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
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
            onClick={() => isLast ? onDone() : setCurrent(c => c + 1)}
            className="flex-1 bg-primary text-black font-black text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-green"
          >
            {isLast ? 'בואו נתחיל!' : 'הבא'}
          </button>
        </div>
      </div>
    </div>
  )
}
