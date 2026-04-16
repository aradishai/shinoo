import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/_next',
  '/favicon',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  if (pathname.includes('.')) return NextResponse.next()

  const token = request.cookies.get('shinu_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Decode JWT payload without verification (verification happens in each API route)
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('invalid')
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.userId) throw new Error('no userId')
    if (payload.exp && payload.exp < Date.now() / 1000) throw new Error('expired')

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('shinu_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
