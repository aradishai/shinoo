import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createToken, setTokenCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'שם משתמש וסיסמה הם שדות חובה' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'שם משתמש או סיסמה שגויים' },
        { status: 401 }
      )
    }

    const token = createToken(user.id)
    const cookieHeader = setTokenCookie(token)

    return NextResponse.json(
      { data: { id: user.id, username: user.username }, message: 'התחברת בהצלחה!' },
      {
        status: 200,
        headers: { 'Set-Cookie': cookieHeader },
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
