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
    body: 'לפני כל משחק, נחש את הסקור הסופי. ככל שהניחוש מדויק יותר — כך תקבל יותר נקודות.',
    points: [
      { label: 'כיוון נכון', pts: '1 נקודה' },
      { label: 'כיוון + הפרש', pts: '3 נקודות' },
      { label: 'תוצאה מדויקת', pts: '5 נקודות' },
    ],
  },
  {
    emoji: '🏆',
    title: 'התחרו עם חברים',
    body: 'צור ליגה, שלח קוד הזמנה לחברים, והתחרו על המקום הראשון בטבלת הניקוד.',
  },
  {
    emoji: null,
    powerups: true,
    title: 'כוחות מיוחדים',
    body: 'במהלך הפסקת המשחק (45-65 דקות) אפשר להפעיל כוח מיוחד אחד:',
    powers: [
      { img: '/x2.png', name: 'X2', desc: 'מכפיל את הנקודות שתקבל' },
      { img: '/logo.png', name: 'שינוי', desc: 'שנה את הניחוש שלך ב-1 גול' },
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
