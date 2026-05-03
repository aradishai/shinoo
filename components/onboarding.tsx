'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

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
    marketIntro: true,
  },
  {
    emoji: null,
    powerupsDemo: true,
  },
  {
    emoji: null,
    notificationsSlide: true,
  },
]

function MarketIntroSlide({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const duration = 7000
    const frame = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(elapsed / duration, 1)
      setProgress(pct)
      if (pct < 1) requestAnimationFrame(frame)
      else onNext()
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [onNext])

  return (
    <div className="w-full flex flex-col items-center text-center gap-8">
      <h2 className="text-white font-black text-3xl leading-snug">המרקט</h2>
      <p className="text-gray-200 text-lg leading-relaxed">
        במרקט תוכל לקנות <span className="text-primary font-black">כפתורים מיוחדים</span> שיעזרו לכם לקבל יותר נקודות מהמשחקים.
        <br /><br />
        כל לחצן ניתן לקנות בעזרת <span className="text-yellow-400 font-black">מטבעות</span>.
      </p>
      <div className="w-full bg-dark-border rounded-full h-1 overflow-hidden">
        <div
          className="h-1 bg-primary rounded-full transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState(0)
  const [notifStatus, setNotifStatus] = useState<'idle' | 'subscribed' | 'denied'>('idle')
  const slide = slides[current]
  const isLast = current === slides.length - 1

  useEffect(() => {
    if ((slide as any).notificationsSlide) {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setNotifStatus('denied')
      } else if (Notification.permission === 'denied') {
        setNotifStatus('denied')
      } else if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg =>
          reg.pushManager.getSubscription().then(sub => {
            if (sub) setNotifStatus('subscribed')
          })
        )
      }
    }
  }, [current])

  const enableNotifications = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setNotifStatus('denied'); return }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('denied'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setNotifStatus('subscribed')
    } catch {
      setNotifStatus('denied')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-dark flex flex-col px-6 pt-10 pb-6" dir="rtl">
      {/* Skip */}
      <div className="flex justify-start mb-4 shrink-0">
        <button onClick={onDone} className="text-gray-600 text-sm">דלג</button>
      </div>

      {/* Slide content — scrollable */}
      <div className="flex-1 overflow-y-auto w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center text-center gap-4 pb-4">

          {slide.logo && (
            <img src="/shinoo-logo.png" alt="SHINOO" className="h-40 w-auto" style={{ mixBlendMode: 'lighten' }} />
          )}

          {(slide as any).scoringDemo && (
            <div className="w-full space-y-2 text-right">
              <h2 className="text-white font-black text-xl text-center mb-1">איך עובד הניקוד?</h2>
              <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-center">
                <p className="text-gray-400 text-xs mb-0.5">הניחוש שלך</p>
                <p className="text-white font-black text-base">4:1 <span className="text-gray-400 font-normal text-sm">ברצלונה נגד ריאל מדריד</span></p>
              </div>
              {[
                { pts: '0 נקודות', color: 'text-gray-500', label: 'לא צדקת במנצחת', sub: 'תיקו / ניצחון ריאל מדריד' },
                { pts: 'נקודה אחת', color: 'text-gray-300', label: 'צדקת במנצחת בלבד', sub: '1:0 לברצלונה / 3:2 לברצלונה' },
                { pts: '3 נקודות', color: 'text-gray-300', label: 'מנצחת + קבוצה אחת', sub: '4:0 (פגעת בברצלונה) / 2:1 (פגעת בריאל)' },
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

          {(slide as any).powerupsDemo && (
            <div className="w-full space-y-2.5 text-right">
              <h2 className="text-white font-black text-xl text-center">המרקט</h2>

              <p className="text-gray-500 text-[11px] font-bold">לפני המשחק</p>
              {[
                { img: '/btn-x3.jpg', desc: 'שלש את הניקוד', cost: 4 },
                { img: '/btn-goals.jpg', desc: 'כל גול שווה נקודה', cost: 3 },
                { img: '/btn-split.jpg', desc: 'נחש 2 תוצאות, וקבל ניקוד על הטובה מבניהן', cost: 2 },
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
                { img: '/btn-90.jpg', desc: 'הגרל ניחוש חדש — עד דקה 90', cost: 1 },
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
                <p className="text-gray-300 text-xs">• כל משחק שניחשת — <span className="text-yellow-400 font-bold">מטבע 1</span> בסיומו</p>
              </div>
            </div>
          )}

          {(slide as any).leagueDemo && (
            <div className="w-full space-y-3 mt-2">
              <div>
                <p className="text-gray-500 text-xs mb-1.5 text-right">① לחץ על "צור ליגה חדשה"</p>
                <div className="bg-dark-card border border-primary/30 rounded-2xl p-4 text-center">
                  <p className="text-white font-bold text-sm">צור ליגה חדשה</p>
                  <p className="text-gray-500 text-xs mt-0.5">הזמן חברים ותתחרו ביניכם</p>
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1.5 text-right">② שתף את קוד ההזמנה</p>
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

          {(slide as any).notificationsSlide && (
            <div className="w-full flex flex-col items-center gap-5 text-center">
              <h2 className="text-white font-black text-2xl">קבל התראות</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                נשלח לך תזכורת לפני משחקים שעוד לא ניחשת עליהם — כדי שלא תפספס
              </p>
              {notifStatus === 'idle' && (
                <button
                  onClick={enableNotifications}
                  className="w-full bg-primary text-black font-black text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-green"
                >
                  הפעל התראות
                </button>
              )}
              {notifStatus === 'subscribed' && (
                <div className="bg-primary/10 border border-primary/30 rounded-2xl px-6 py-4 w-full">
                  <p className="text-primary font-black text-base">✓ ההתראות פעילות!</p>
                </div>
              )}
              {notifStatus === 'denied' && (
                <div className="bg-dark-card border border-dark-border rounded-2xl px-6 py-4 w-full text-center">
                  <p className="text-gray-300 text-sm font-bold mb-1">התראות חסומות בדפדפן</p>
                  <p className="text-gray-500 text-xs">כדי להפעיל — עבור להגדרות הדפדפן ואפשר התראות לאתר</p>
                </div>
              )}
              <button onClick={onDone} className="text-gray-600 text-sm">
                {notifStatus === 'idle' ? 'דלג' : 'בואו נתחיל!'}
              </button>
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
      {!(slide as any).notificationsSlide && (
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
              onClick={() => isLast ? onDone() : setCurrent(c => c + 1)}
              className="flex-1 bg-primary text-black font-black text-lg py-4 rounded-2xl active:scale-95 transition-all shadow-green"
            >
              {isLast ? 'בואו נתחיל!' : 'הבא'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
