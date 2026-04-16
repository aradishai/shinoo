import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken, setTokenCookie } from '@/lib/auth'

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


    const existingUser = await db.user.findUnique({ where: { username } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'שם המשתמש כבר תפוס' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: { username, passwordHash },
    })

    const token = createToken(user.id)
    const cookieHeader = setTokenCookie(token)

    return NextResponse.json(
      { data: { id: user.id, username: user.username }, message: 'נרשמת בהצלחה!' },
      {
        status: 201,
        headers: { 'Set-Cookie': cookieHeader },
      }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית' },
      { status: 500 }
    )
  }
}
