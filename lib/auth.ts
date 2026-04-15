import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const COOKIE_NAME = 'shinu_token'
const TOKEN_EXPIRY = '30d'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string }
    return { userId: payload.userId }
  } catch {
    return null
  }
}

export async function getSession(request?: Request): Promise<{ userId: string } | null> {
  let token: string | undefined

  if (request) {
    // Extract from request headers (for API routes)
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    token = match?.[1]
  } else {
    // Extract from Next.js cookies() helper (for server components)
    try {
      const cookieStore = cookies()
      token = cookieStore.get(COOKIE_NAME)?.value
    } catch {
      return null
    }
  }

  if (!token) return null

  return verifyToken(token)
}

export function setTokenCookie(token: string): string {
  const maxAge = 30 * 24 * 60 * 60 // 30 days in seconds
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}
