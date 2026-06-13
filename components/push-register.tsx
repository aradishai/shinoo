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
    // Remove all whitespace in case of copy-paste artifacts
    return key ? String(key).replace(/\s/g, '') : null
  } catch { return null }
}

async function saveSubscription(sub: PushSubscription) {
  await fetch('/api/push/subscribe', {
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
}

// Called from button click - requests permission + creates fresh subscription
export async function registerPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission === 'denied') return false

  try {
    const key = await getVapidKey()
    if (!key) return false

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return false
    }

    // Try to reuse existing subscription, only create new if none exists
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
    }

    await saveSubscription(sub)
    return true
  } catch { return false }
}

export function PushRegister() {
  useEffect(() => {
    // Only silently save existing subscription - never unsubscribe or create new one
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const silentSave = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) await saveSubscription(existing)
      } catch { /* silent */ }
    }

    silentSave()
  }, [])

  return null
}
