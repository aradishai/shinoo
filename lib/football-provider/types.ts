export interface FootballProvider {
  getFixtures(tournamentId: string, season: string): Promise<ProviderMatch[]>
  getMatchResult(providerMatchId: string): Promise<ProviderResult | null>
  getMatchScorers(providerMatchId: string): Promise<ProviderScorer[]>
  getLiveMatches(tournamentId: string): Promise<ProviderMatch[]>
}

export interface ProviderMatch {
  providerMatchId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamCode: string
  awayTeamCode: string
  kickoffAt: Date
  status: string
  homeScore?: number
  awayScore?: number
  round?: string
}

export interface ProviderResult {
  homeScore: number
  awayScore: number
  status: string
}

export interface ProviderScorer {
  playerName: string
  goals: number
}

export type ProviderStatus =
  | 'SCHEDULED'
  | 'LOCKED'
  | 'LIVE'
  | 'FINISHED'
  | 'CANCELLED'
  | 'POSTPONED'
