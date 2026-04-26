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
    emoji: '⚽',
    title: 'נחש את התוצאה',
    body: 'לפני כל משחק, נחש את הסקור הסופי. לדוגמה — המשחק נגמר 2:1, ניחשת 2:0:',
    points: [
      { label: 'ניחשת שארגנטינה תנצח ✓', pts: '1 נקודה' },
      { label: 'ניחשת שארגנטינה תכבוש 2 ✓', pts: '3 נקודות' },
      { label: 'ניחשת בדיוק 2:1 ✓', pts: '5 נקודות' },
    ],
  },
  {
    emoji: null,
    leagueDemo: true,
    title: 'התחרו עם חברים',
    body: 'צור ליגה, שלח קוד הזמנה לחברים, והתחרו על המקום הראשון.',
  },
  {
    emoji: null,
    powerups: true,
    title: 'לחצנים מיוחדים',
    body: 'בזמן ההפסקה של המשחק אפשר להשתמש בלחצן אחד באותו משחק, ופעמיים במחזור. לדוגמה — ניחשת 2:1 והמשחק הולך 3:1, אפשר:',
    powers: [
      { img: '/x2.png', name: 'X2', desc: 'מכפיל את הנקודות שתקבל' },
      { img: '/logo.png', name: 'SHINOO', desc: 'שנה את הניחוש שלך בגול 1 לאחת הקבוצות' },
    ],
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
        {slide.powerups && (
          <div className="flex gap-8 justify-center mt-4">
            {slide.powers?.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center">
                  <img src={p.img} alt={p.name} className="w-14 h-14 object-contain" style={{ mixBlendMode: 'lighten' }} />
                </div>
                <span className="text-white font-bold text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-white font-black text-2xl mt-2">{slide.title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">{slide.body}</p>

        {slide.points && (
          <div className="w-full space-y-2">
            {slide.points.map((p) => (
              <div key={p.label} className="flex items-center justify-between bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                <span className="text-primary font-black text-sm">{p.pts}</span>
                <span className="text-gray-300 text-sm">{p.label}</span>
              </div>
            ))}
          </div>
        )}

        {slide.powers && (
          <div className="w-full space-y-2">
            {slide.powers.map((p) => (
              <div key={p.name} className="flex items-center justify-between bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                <span className="text-gray-400 text-sm">{p.desc}</span>
                <span className="text-white font-bold text-sm">{p.name}</span>
              </div>
            ))}
          </div>
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
        <button
          onClick={() => isLast ? onDone() : setCurrent(c => c + 1)}
          className="w-full bg-primary text-black font-black text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-green"
        >
          {isLast ? 'בואו נתחיל!' : 'הבא'}
        </button>
      </div>
    </div>
  )
}
