'use client'

import { useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr
}

export function uint8ToBase64(buf: ArrayBuffer) {
  const arr = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str)
}

async function getVapidKey(): Promise<string | null> {
  try {
    const { key } = await fetch('/api/push/vapid-public-key').then(r => r.json())
    return key ? String(key).replace(/\s/g, '') : null
  } catch { return null }
}

async function saveSubscription(sub: PushSubscription): Promise<{ ok: boolean; status: number }> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: {
        p256dh: uint8ToBase64(sub.getKey('p256dh')!),
        auth: uint8ToBase64(sub.getKey('auth')!),
      },
    }),
  })
  return { ok: res.ok, status: res.status }
}

// Called ONLY from button click - always creates fresh subscription with current VAPID key
export async function registerPush(): Promise<{ ok: boolean; error?: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    return { ok: false, error: 'הדפדפן לא תומך בהתראות' }
  if (Notification.permission === 'denied')
    return { ok: false, error: 'חסמת התראות בהגדרות הדפדפן' }

  try {
    // Use env var baked at build time first, fallback to API
    let key: string | null = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '').replace(/\s/g, '') || null
    if (!key) key = await getVapidKey()
    if (!key) return { ok: false, error: 'מפתח VAPID חסר בשרת' }

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return { ok: false, error: 'לא אישרת התראות' }
    }

    const existing = await reg.pushManager.getSubscription()
    if (existing) await existing.unsubscribe()

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    })

    const res = await saveSubscription(sub)
    if (!res.ok) return { ok: false, error: `שגיאת שמירה: ${res.status}` }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export function PushRegister() {
  useEffect(() => {
    // Only silently save subscription that ALREADY EXISTS in browser - never create new ones
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const silentSave = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: existing.endpoint,
              keys: {
                p256dh: uint8ToBase64(existing.getKey('p256dh')!),
                auth: uint8ToBase64(existing.getKey('auth')!),
              },
            }),
          })
          if (!res.ok) console.error('silentSave failed:', res.status)
        }
      } catch { /* silent */ }
    }

    silentSave()
  }, [])

  return null
}
