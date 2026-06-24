import { NextResponse } from 'next/server'

// X3 temporarily disabled
export async function POST() {
  return NextResponse.json({ error: 'לחצן כפול 3 אינו זמין' }, { status: 403 })
}
