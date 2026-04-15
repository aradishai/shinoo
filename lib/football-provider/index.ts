import type { FootballProvider } from './types'
import { ApiFootballProvider } from './api-football'

export function getFootballProvider(): FootballProvider {
  return new ApiFootballProvider()
}

export type { FootballProvider, ProviderMatch, ProviderResult, ProviderScorer } from './types'
