import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? null
  const vapidVars = Object.keys(process.env).filter(k => k.toUpperCase().includes('VAPID'))
  console.log('[vapid] env keys with VAPID:', vapidVars)
  console.log('[vapid] VAPID_PUBLIC_KEY:', key ? `len=${key.length}` : 'MISSING')
  return NextResponse.json({ key })
}
