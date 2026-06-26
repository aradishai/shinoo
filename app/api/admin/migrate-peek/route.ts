import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: string[] = []

  try {
    await db.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "peekStock" INTEGER NOT NULL DEFAULT 0`
    results.push('Added peekStock to User')
  } catch (e: any) { results.push(`User.peekStock: ${e.message}`) }

  try {
    await db.$executeRaw`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "peekApplied" BOOLEAN NOT NULL DEFAULT false`
    results.push('Added peekApplied to Prediction')
  } catch (e: any) { results.push(`Prediction.peekApplied: ${e.message}`) }

  try {
    await db.$executeRaw`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "peekLockAt" TIMESTAMP(3)`
    results.push('Added peekLockAt to Prediction')
  } catch (e: any) { results.push(`Prediction.peekLockAt: ${e.message}`) }

  return NextResponse.json({ ok: true, results })
}
