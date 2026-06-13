'use client'

import { useEffect } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr
}

function uint8ToBase64(buf: ArrayBuffer) {
  const arr = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str)
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
            body: JSON.stringify({ endpoint: existing.endpoint, keys: { p256dh: uint8ToBase64(existing.getKey('p256dh')!), auth: uint8ToBase64(existing.getKey('auth')!) } }),
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

        const p256dh = uint8ToBase64(sub.getKey('p256dh')!)
        const auth = uint8ToBase64(sub.getKey('auth')!)

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
