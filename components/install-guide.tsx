'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'install_guide_dismissed_v1'
const SOLOKILLER_USERNAME = 'Solokiller'
const APP_URL = 'https://shinoo-production-7ab8.up.railway.app'

export function InstallGuide() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.data?.username === SOLOKILLER_USERNAME) setShow(true)
      })
      .catch(() => {})
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-black text-xl text-right">היי Solokiller! 👋</h2>
        <p className="text-gray-300 text-sm text-right leading-relaxed">
          כדי לקבל התראות על משחקים ולהשתמש באפליקציה בנוחות — כדאי להתקין אותה על המסך הבית.
        </p>

        {/* Link */}
        <div className="bg-dark-muted rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-1">קישור לאתר</p>
          <a
            href={APP_URL}
            className="text-primary font-bold text-sm break-all"
            target="_blank"
            rel="noreferrer"
          >
            {APP_URL}
          </a>
        </div>

        {/* iOS */}
        <div className="bg-dark-muted rounded-xl p-3 space-y-1">
          <p className="text-white font-bold text-sm text-right">iPhone (Safari)</p>
          <p className="text-gray-400 text-xs text-right leading-relaxed">
            1. פתחי את הקישור ב-Safari<br />
            2. לחצי על כפתור השיתוף ⎋ (בתחתית המסך)<br />
            3. גללי למטה ובחרי <strong className="text-white">"הוסף למסך הבית"</strong><br />
            4. כשהאפליקציה תשאל — אשרי התראות ✅
          </p>
        </div>

        {/* Android */}
        <div className="bg-dark-muted rounded-xl p-3 space-y-1">
          <p className="text-white font-bold text-sm text-right">אנדרואיד (Chrome)</p>
          <p className="text-gray-400 text-xs text-right leading-relaxed">
            1. פתחי את הקישור ב-Chrome<br />
            2. לחצי על 3 הנקודות בפינה הימנית העליונה<br />
            3. בחרי <strong className="text-white">"הוסף למסך הבית"</strong><br />
            4. כשהאפליקציה תשאל — אשרי התראות ✅
          </p>
        </div>

        <button
          onClick={dismiss}
          className="w-full py-3 rounded-xl bg-primary text-black font-black text-base active:scale-95 transition-all"
        >
          הבנתי, תודה!
        </button>
      </div>
    </div>
  )
}
