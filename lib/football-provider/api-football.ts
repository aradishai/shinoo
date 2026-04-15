import axios, { AxiosInstance } from 'axios'
import type { FootballProvider, ProviderMatch, ProviderResult, ProviderScorer } from './types'

// World Cup 2026: league ID 1 in API-Football
const WC_LEAGUE_ID = 1

const API_STATUS_MAP: Record<string, string> = {
  'TBD': 'SCHEDULED',
  'NS': 'SCHEDULED',       // Not Started
  '1H': 'LIVE',            // First Half
  'HT': 'LIVE',            // Half Time
  '2H': 'LIVE',            // Second Half
  'ET': 'LIVE',            // Extra Time
  'BT': 'LIVE',            // Break Time
  'P': 'LIVE',             // Penalty In Progress
  'SUSP': 'POSTPONED',     // Suspended
  'INT': 'LIVE',           // Interrupted
  'FT': 'FINISHED',        // Full Time
  'AET': 'FINISHED',       // After Extra Time
  'PEN': 'FINISHED',       // After Penalties
  'PST': 'POSTPONED',      // Postponed
  'CANC': 'CANCELLED',     // Cancelled
  'ABD': 'CANCELLED',      // Abandoned
  'AWD': 'FINISHED',       // Technical Loss
  'WO': 'FINISHED',        // Walkover
  'LIVE': 'LIVE',
}

export class ApiFootballProvider implements FootballProvider {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `https://${process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io'}`,
      headers: {
        'x-rapidapi-key': process.env.FOOTBALL_API_KEY || '',
        'x-rapidapi-host': process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io',
      },
      timeout: 10000,
    })
  }

  private mapStatus(apiStatus: string): string {
    return API_STATUS_MAP[apiStatus] || 'SCHEDULED'
  }

  async getFixtures(tournamentId: string, season: string): Promise<ProviderMatch[]> {
    try {
      const response = await this.client.get('/fixtures', {
        params: {
          league: WC_LEAGUE_ID,
          season: season,
        },
      })

      const fixtures = response.data?.response || []

      return fixtures.map((fixture: any) => ({
        providerMatchId: String(fixture.fixture.id),
        homeTeamName: fixture.teams.home.name,
        awayTeamName: fixture.teams.away.name,
        homeTeamCode: fixture.teams.home.code || fixture.teams.home.name.substring(0, 3).toUpperCase(),
        awayTeamCode: fixture.teams.away.code || fixture.teams.away.name.substring(0, 3).toUpperCase(),
        kickoffAt: new Date(fixture.fixture.date),
        status: this.mapStatus(fixture.fixture.status.short),
        homeScore: fixture.goals.home ?? undefined,
        awayScore: fixture.goals.away ?? undefined,
        round: fixture.league.round,
      }))
    } catch (error) {
      console.error('Failed to fetch fixtures from API-Football:', error)
      return []
    }
  }

  async getMatchResult(providerMatchId: string): Promise<ProviderResult | null> {
    try {
      const response = await this.client.get('/fixtures', {
        params: { id: providerMatchId },
      })

      const fixture = response.data?.response?.[0]
      if (!fixture) return null

      return {
        homeScore: fixture.goals.home ?? 0,
        awayScore: fixture.goals.away ?? 0,
        status: this.mapStatus(fixture.fixture.status.short),
      }
    } catch (error) {
      console.error(`Failed to fetch match result for ${providerMatchId}:`, error)
      return null
    }
  }

  async getMatchScorers(providerMatchId: string): Promise<ProviderScorer[]> {
    try {
      const response = await this.client.get('/fixtures/events', {
        params: {
          fixture: providerMatchId,
          type: 'Goal',
        },
      })

      const events = response.data?.response || []
      const scorerMap = new Map<string, number>()

      for (const event of events) {
        if (event.type === 'Goal' && event.detail !== 'Own Goal') {
          const playerName = event.player.name
          scorerMap.set(playerName, (scorerMap.get(playerName) || 0) + 1)
        }
      }

      return Array.from(scorerMap.entries()).map(([playerName, goals]) => ({
        playerName,
        goals,
      }))
    } catch (error) {
      console.error(`Failed to fetch scorers for match ${providerMatchId}:`, error)
      return []
    }
  }

  async getLiveMatches(tournamentId: string): Promise<ProviderMatch[]> {
    try {
      const response = await this.client.get('/fixtures', {
        params: {
          league: WC_LEAGUE_ID,
          live: 'all',
        },
      })

      const fixtures = response.data?.response || []

      return fixtures.map((fixture: any) => ({
        providerMatchId: String(fixture.fixture.id),
        homeTeamName: fixture.teams.home.name,
        awayTeamName: fixture.teams.away.name,
        homeTeamCode: fixture.teams.home.code || fixture.teams.home.name.substring(0, 3).toUpperCase(),
        awayTeamCode: fixture.teams.away.code || fixture.teams.away.name.substring(0, 3).toUpperCase(),
        kickoffAt: new Date(fixture.fixture.date),
        status: this.mapStatus(fixture.fixture.status.short),
        homeScore: fixture.goals.home ?? undefined,
        awayScore: fixture.goals.away ?? undefined,
        round: fixture.league.round,
      }))
    } catch (error) {
      console.error('Failed to fetch live matches from API-Football:', error)
      return []
    }
  }
}
