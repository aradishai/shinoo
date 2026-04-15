import { NextResponse } from 'next/server'
import { clearTokenCookie } from '@/lib/auth'

export async function POST() {
  return NextResponse.json(
    { message: 'התנתקת בהצלחה' },
    {
      status: 200,
      headers: { 'Set-Cookie': clearTokenCookie() },
    }
  )
}
