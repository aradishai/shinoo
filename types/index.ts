export type { MatchStatus, LeagueMemberRole } from '@prisma/client'

export interface UserSession {
  userId: string
}

export interface ApiError {
  error: string
  details?: string
}

export interface ApiSuccess<T = unknown> {
  data: T
  message?: string
}

export interface LeagueWithStats {
  id: string
  name: string
  inviteCode: string
  createdAt: Date
  memberCount: number
  userRank: number
  userPoints: number
  createdByUserId: string
}

export interface StandingsEntry {
  rank: number
  previousRank?: number
  userId: string
  username: string
  totalPoints: number
  correctPredictions: number
  exactScores: number
  rankChange?: 'up' | 'down' | 'same'
}

export interface MatchWithTeams {
  id: string
  tournamentId: string
  homeTeamId: string
  awayTeamId: string
  kickoffAt: Date
  lockAt: Date
  status: string
  homeScore: number | null
  awayScore: number | null
  round: string | null
  providerMatchId: string | null
  homeTeam: {
    id: string
    nameHe: string
    nameEn: string
    code: string
    flagUrl: string | null
  }
  awayTeam: {
    id: string
    nameHe: string
    nameEn: string
    code: string
    flagUrl: string | null
  }
}

export interface PredictionWithPoints {
  id: string
  userId: string
  leagueId: string
  matchId: string
  predictedHomeScore: number
  predictedAwayScore: number
  predictedTopScorerPlayerId: string | null
  createdAt: Date
  updatedAt: Date
  points?: {
    resultPoints: number
    topScorerPoints: number
    totalPoints: number
    explanation: string | null
  } | null
}
