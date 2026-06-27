import { db } from './db'

export function hasAnyPowerupApplied(prediction: any): boolean {
  return !!(
    prediction.x2Applied ||
    prediction.shinooApplied ||
    prediction.x3Applied ||
    prediction.goalsApplied ||
    prediction.minute90Applied ||
    prediction.splitApplied ||
    prediction.allinApplied ||
    prediction.peekApplied ||
    prediction.et120Applied
  )
}

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
