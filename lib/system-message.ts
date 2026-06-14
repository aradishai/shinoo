import { db } from '@/lib/db'

export async function postSystemMessage(leagueId: string, userId: string, content: string) {
  try {
    await db.message.create({ data: { leagueId, userId, content, isSystem: true } })
  } catch (e) {
    console.error('postSystemMessage failed:', e)
  }
}
