import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? null
  console.log('[vapid] VAPID_PUBLIC_KEY set:', !!key, key ? `len=${key.length}` : 'MISSING')
  return NextResponse.json({ key })
}
