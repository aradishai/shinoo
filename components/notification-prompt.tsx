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

async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pub),
  })
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  })
}

export function NotificationPrompt() {
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState<'ask' | 'success' | 'denied'>('ask')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return
    if (localStorage.getItem('push_dismissed')) return

    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (!sub) setTimeout(() => setShow(true), 1500)
      })
    )
  }, [])

  const dismiss = () => {
    localStorage.setItem('push_dismissed', '1')
    setShow(false)
  }

  const enable = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        await subscribeUser()
        setPhase('success')
        setTimeout(() => { setShow(false) }, 2000)
      } else {
        setPhase('denied')
      }
    } catch {
      setPhase('denied')
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" dir="rtl">
      <div className="bg-dark-card border border-dark-border rounded-t-3xl w-full max-w-sm pb-10 pt-6 px-6 shadow-2xl">

        {phase === 'ask' && (
          <>
            <div className="text-4xl mb-3 text-center">🔔</div>
            <h3 className="text-white font-black text-lg text-center mb-1">רוצה לקבל התראות?</h3>
            <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
              נשלח לך תזכורת לפני משחקים שעוד לא ניחשת עליהם
            </p>
            <button
              onClick={enable}
              className="w-full bg-primary text-black font-black text-base py-3.5 rounded-2xl active:scale-95 transition-all mb-3"
            >
              כן, אני רוצה
            </button>
            <button
              onClick={dismiss}
              className="w-full text-gray-500 font-medium text-sm py-2"
            >
              לא עכשיו
            </button>
          </>
        )}

        {phase === 'success' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-black text-lg">מעולה! ההתראות פעילות</p>
          </div>
        )}

        {phase === 'denied' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🔕</div>
            <p className="text-white font-black text-base mb-2">ההרשאה נדחתה</p>
            <p className="text-gray-400 text-xs mb-4">ניתן להפעיל ידנית דרך הגדרות הדפדפן</p>
            <button onClick={dismiss} className="text-gray-500 text-sm font-medium">סגור</button>
          </div>
        )}
      </div>
    </div>
  )
}
