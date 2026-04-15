'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Badge, matchStatusToBadgeVariant } from '@/components/badge'
import { PredictionForm } from '@/components/prediction-form'
import { Countdown } from '@/components/countdown'

interface Player {
  id: string
  nameHe: string
  nameEn: string
}

interface Team {
  id: string
  nameHe: string
  nameEn: string
  code: string
  flagUrl?: string | null
  players: Player[]
}

interface Scorer {
  id: string
  goals: number
  player: Player
}

interface Match {
  id: string
  homeTeam: Team
  awayTeam: Team
  kickoffAt: string
  lockAt: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
  round?: string | null
  tournament: { nameHe: string }
  scorers: Scorer[]
}

interface Prediction {
  id: string
  leagueId: string
  league: { name: string }
  predictedHomeScore: number
  predictedAwayScore: number
  predictedTopScorerPlayerId?: string | null
  predictedTopScorer?: Player | null
  points?: {
    resultPoints: number
    topScorerPoints: number
    totalPoints: number
    explanation: string | null
  } | null
}

const TEAM_FLAGS: Record<string, string> = {
  BRA: '🇧🇷', ARG: '🇦🇷', FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  GER: '🇩🇪', ESP: '🇪🇸', POR: '🇵🇹', MAR: '🇲🇦',
}

function TeamFlag({ code }: { code: string }) {
  const emoji = TEAM_FLAGS[code]
  return <span className="text-4xl">{emoji || code}</span>
}

function PointsBadge({ points }: { points: number }) {
  const color =
    points === 7 ? 'text-secondary'
    : points >= 5 ? 'text-primary'
    : points >= 3 ? 'text-yellow-400'
    : points >= 1 ? 'text-gray-300'
    : 'text-gray-600'

  return <span className={`font-black text-2xl ${color}`}>+{points}</span>
}

export default function MatchDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const matchId = params.id as string
  const leagueId = searchParams.get('leagueId')

  const [match, setMatch] = useState<Match | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [userLeagues, setUserLeagues] = useState<{ id: string; name: string }[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(leagueId || '')

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, leaguesRes] = await Promise.all([
        fetch(`/api/matches/${matchId}`),
        fetch('/api/leagues'),
      ])

      const [matchData, leaguesData] = await Promise.all([
        matchRes.json(),
        leaguesRes.json(),
      ])

      setMatch(matchData.data?.match)
      setPredictions(matchData.data?.predictions || [])

      const leaguesList = (leaguesData.data || []).map((l: { id: string; name: string }) => ({
        id: l.id,
        name: l.name,
      }))
      setUserLeagues(leaguesList)

      if (!selectedLeagueId && leaguesList.length > 0) {
        setSelectedLeagueId(leagueId || leaguesList[0]?.id || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [matchId, leagueId, selectedLeagueId])

  useEffect(() => {
    fetchData()
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const activePrediction = predictions.find((p) => p.leagueId === selectedLeagueId)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">⚽</div>
          <p className="text-gray-500">טוען...</p>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-gray-500">משחק לא נמצא</p>
        <Link href="/" className="text-primary mt-4 block">חזרה לבית</Link>
      </div>
    )
  }

  const kickoff = new Date(match.kickoffAt)
  const lockAt = new Date(match.lockAt)
  const isLocked = match.status === 'LOCKED' || match.status === 'LIVE' || match.status === 'FINISHED'
  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'LIVE'
  const isOpen = match.status === 'SCHEDULED' && new Date() < lockAt

  const topScorers = match.scorers.sort((a, b) => b.goals - a.goals)
  const maxGoals = topScorers[0]?.goals || 0
  const matchTopScorers = topScorers.filter((s) => s.goals === maxGoals)

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← חזרה
        </button>
        <Badge variant={matchStatusToBadgeVariant(match.status)} />
        <div className="text-xs text-gray-500">{match.tournament.nameHe}</div>
      </div>

      {/* Match Header */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-6">
        {/* Round */}
        {match.round && (
          <p className="text-center text-gray-500 text-xs mb-4">{match.round}</p>
        )}

        {/* Teams & Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamFlag code={match.homeTeam.code} />
            <p className="text-white font-bold text-sm text-center">{match.homeTeam.nameHe}</p>
          </div>

          {/* Score / Kickoff */}
          <div className="flex flex-col items-center gap-2">
            {(isFinished || isLive) && match.homeScore !== null && match.awayScore !== null ? (
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {match.homeScore}
                </span>
                <span className="text-gray-500 text-2xl">-</span>
                <span className={`text-4xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {match.awayScore}
                </span>
              </div>
            ) : (
              <>
                <p className="text-white font-bold text-lg">
                  {format(kickoff, 'HH:mm', { locale: he })}
                </p>
                <p className="text-gray-500 text-sm">
                  {format(kickoff, 'EEEE, d בMMMM', { locale: he })}
                </p>
              </>
            )}

            {isOpen && (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">נועל עוד</p>
                <Countdown targetDate={lockAt} />
              </div>
            )}

            {isLive && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                בלייב
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <TeamFlag code={match.awayTeam.code} />
            <p className="text-white font-bold text-sm text-center">{match.awayTeam.nameHe}</p>
          </div>
        </div>
      </div>

      {/* Scorers (post-match) */}
      {isFinished && match.scorers.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-6">
          <h3 className="text-white font-bold mb-3 text-right">כובשי שערים</h3>
          <div className="space-y-2">
            {topScorers.slice(0, 8).map((scorer) => (
              <div key={scorer.id} className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">
                  {scorer.goals > 1 ? `× ${scorer.goals}` : ''}
                  <span className="text-primary ml-1">⚽</span>
                </span>
                <span className="text-white font-medium">{scorer.player.nameHe}</span>
              </div>
            ))}
          </div>

          {matchTopScorers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-border text-right">
              <p className="text-xs text-gray-500 mb-1">מלך שערים</p>
              <p className="text-secondary font-bold">
                {matchTopScorers.map((s) => s.player.nameHe).join(', ')} ({maxGoals} שערים)
              </p>
            </div>
          )}
        </div>
      )}

      {/* League Selector */}
      {userLeagues.length > 1 && (
        <div className="mb-4">
          <label className="block text-gray-400 text-sm font-medium mb-2 text-right">
            ניחוש עבור ליגה
          </label>
          <select
            value={selectedLeagueId}
            onChange={(e) => setSelectedLeagueId(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none appearance-none"
          >
            {userLeagues.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Prediction Form */}
      {selectedLeagueId && (
        <PredictionForm
          matchId={matchId}
          leagueId={selectedLeagueId}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homePlayers={match.homeTeam.players}
          awayPlayers={match.awayTeam.players}
          existingPrediction={activePrediction}
          isLocked={isLocked}
          onSuccess={() => fetchData()}
        />
      )}

      {/* All Predictions Summary */}
      {predictions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-bold mb-3 text-right">הניחושים שלי לכל ליגה</h3>
          <div className="space-y-3">
            {predictions.map((pred) => (
              <div
                key={pred.id}
                className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {pred.points && (
                    <PointsBadge points={pred.points.totalPoints} />
                  )}
                  <div>
                    <p className="text-primary font-black text-lg">
                      {pred.predictedHomeScore} - {pred.predictedAwayScore}
                    </p>
                    {pred.predictedTopScorer && (
                      <p className="text-gray-500 text-xs">{pred.predictedTopScorer.nameHe} ⚽</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium text-sm">{pred.league.name}</p>
                  {pred.points?.explanation && (
                    <p className="text-gray-500 text-xs mt-0.5 max-w-[160px] text-right">
                      {pred.points.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
