'use client'

import { useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function PushRegister() {
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        if (Notification.permission === 'denied') return

        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: existing.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(existing.getKey('p256dh')!))), auth: btoa(String.fromCharCode(...new Uint8Array(existing.getKey('auth')!))) } }),
          })
          return
        }

        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') return
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!)))
        const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!)))

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh, auth } }),
        })
      } catch { /* silent */ }
    }

    register()
  }, [])

  return null
}
