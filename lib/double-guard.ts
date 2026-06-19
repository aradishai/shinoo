import { db } from './db'

export async function isInDoubleEntry(predictionId: string): Promise<boolean> {
  const entry = await (db as any).doubleEntry.findFirst({
    where: {
      resolved: false,
      OR: [
        { predictionId1: predictionId },
        { predictionId2: predictionId },
      ],
    },
  })
  return !!entry
}
