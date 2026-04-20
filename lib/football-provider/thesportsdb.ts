import axios from 'axios'
import type { FootballProvider, ProviderMatch, ProviderResult, ProviderScorer } from './types'

const BASE = 'https://www.thesportsdb.com/api/v1/json/3'

const STATUS_MAP: Record<string, string> = {
  'Not Started': 'SCHEDULED',
  'Match Finished': 'FINISHED',
  'After Extra Time': 'FINISHED',
  'After Penalties': 'FINISHED',
  '1H': 'LIVE',
  'HT': 'LIVE',
  '2H': 'LIVE',
  'ET': 'LIVE',
  'BT': 'LIVE',
  'Match Postponed': 'POSTPONED',
  'Match Cancelled': 'CANCELLED',
  'Match Abandoned': 'CANCELLED',
}

// Tournament slug → TheSportsDB league ID
const SLUG_TO_LEAGUE: Record<string, number> = {
  'laliga-2025-2026': 4335,
}

export class TheSportsDbProvider implements FootballProvider {
  private mapStatus(s: string): string {
    return STATUS_MAP[s] ?? 'SCHEDULED'
  }

  async getFixtures(tournamentSlug: string, season: string): Promise<ProviderMatch[]> {
    const leagueId = SLUG_TO_LEAGUE[tournamentSlug]
    if (!leagueId) return []
    try {
      const res = await axios.get(`${BASE}/eventsseason.php`, {
        params: { id: leagueId, s: season },
        timeout: 10000,
      })
      const events: any[] = res.data?.events ?? []
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

      return events
        .filter((e: any) => e.dateEvent && e.strTime)
        .map((e: any) => ({
          providerMatchId: String(e.idEvent),
          homeTeamName: e.strHomeTeam,
          awayTeamName: e.strAwayTeam,
          homeTeamCode: String(e.idHomeTeam),
          awayTeamCode: String(e.idAwayTeam),
          kickoffAt: new Date(`${e.dateEvent}T${e.strTime}Z`),
          status: this.mapStatus(e.strStatus ?? 'Not Started'),
          homeScore: e.intHomeScore !== null && e.intHomeScore !== '' ? Number(e.intHomeScore) : undefined,
          awayScore: e.intAwayScore !== null && e.intAwayScore !== '' ? Number(e.intAwayScore) : undefined,
          round: e.intRound ? `Jornada ${e.intRound}` : undefined,
        }))
        .filter((m) => m.kickoffAt >= cutoff)
    } catch (err) {
      console.error('[tsdb] getFixtures error:', err)
      return []
    }
  }

  async getMatchResult(providerMatchId: string): Promise<ProviderResult | null> {
    try {
      const res = await axios.get(`${BASE}/lookupevent.php`, {
        params: { id: providerMatchId },
        timeout: 10000,
      })
      const e = res.data?.events?.[0]
      if (!e) return null
      return {
        homeScore: Number(e.intHomeScore) || 0,
        awayScore: Number(e.intAwayScore) || 0,
        status: this.mapStatus(e.strStatus ?? ''),
      }
    } catch {
      return null
    }
  }

  async getLiveMatches(tournamentSlug: string): Promise<ProviderMatch[]> {
    const leagueId = SLUG_TO_LEAGUE[tournamentSlug]
    if (!leagueId) return []
    try {
      const res = await axios.get(`${BASE}/livescore.php`, {
        params: { l: leagueId },
        timeout: 10000,
      })
      const events: any[] = res.data?.events ?? []
      return events.map((e: any) => ({
        providerMatchId: String(e.idEvent),
        homeTeamName: e.strHomeTeam,
        awayTeamName: e.strAwayTeam,
        homeTeamCode: String(e.idHomeTeam),
        awayTeamCode: String(e.idAwayTeam),
        kickoffAt: new Date(`${e.dateEvent}T${e.strTime ?? '00:00:00'}Z`),
        status: 'LIVE',
        homeScore: Number(e.intHomeScore) || 0,
        awayScore: Number(e.intAwayScore) || 0,
        round: e.strRound,
      }))
    } catch {
      return []
    }
  }

  async getMatchScorers(_matchId: string): Promise<ProviderScorer[]> {
    return []
  }
}
