import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: string[] = []

  try {
    await db.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "et120Stock" INTEGER NOT NULL DEFAULT 0`
    results.push('Added et120Stock to User')
  } catch (e: any) { results.push(`User.et120Stock: ${e.message}`) }

  try {
    await db.$executeRaw`ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "et120Applied" BOOLEAN NOT NULL DEFAULT false`
    results.push('Added et120Applied to Prediction')
  } catch (e: any) { results.push(`Prediction.et120Applied: ${e.message}`) }

  try {
    await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeScoreET" INTEGER`
    results.push('Added homeScoreET to Match')
  } catch (e: any) { results.push(`Match.homeScoreET: ${e.message}`) }

  try {
    await db.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayScoreET" INTEGER`
    results.push('Added awayScoreET to Match')
  } catch (e: any) { results.push(`Match.awayScoreET: ${e.message}`) }

  return NextResponse.json({ ok: true, results })
}
