import { NextResponse } from 'next/server'
import { syncKnockoutMatches } from '@/lib/sync-knockout'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = request.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await syncKnockoutMatches()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('sync-knockout error:', error?.response?.data || error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
