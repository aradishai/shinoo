'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MatchCard } from '@/components/match-card'
import { PredictionForm } from '@/components/prediction-form'

interface Player { id: string; nameHe: string; nameEn: string }
interface Team { id: string; nameHe: string; nameEn: string; code: string; flagUrl?: string | null; players: Player[] }

interface Match {
  id: string
  homeTeam: { id: string; nameHe: string; nameEn: string; code: string; flagUrl?: string | null }
  awayTeam: { id: string; nameHe: string; nameEn: string; code: string; flagUrl?: string | null }
  kickoffAt: string
  lockAt: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
  round?: string | null
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; predictedTopScorerPlayerId?: string | null } | null
}

interface ExpandedData {
  homeTeam: Team
  awayTeam: Team
  leagueId: string
  existingPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; predictedTopScorerPlayerId?: string | null } | null
}

const STATUS_TABS = [
  { label: 'הכל', value: '' },
  { label: 'פתוח', value: 'SCHEDULED' },
  { label: 'נעול', value: 'LOCKED' },
  { label: 'בלייב', value: 'LIVE' },
  { label: 'הסתיים', value: 'FINISHED' },
]

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('')
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)
  const [expandedData, setExpandedData] = useState<ExpandedData | null>(null)
  const [expandLoading, setExpandLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const url = activeStatus ? `/api/matches?status=${activeStatus}` : '/api/matches'
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMatches(data.data || []))
      .finally(() => setLoading(false))
  }, [activeStatus])

  const handlePredictClick = async (match: Match) => {
    // toggle off
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
      setExpandedData(null)
      return
    }

    setExpandedMatchId(match.id)
    setExpandedData(null)
    setExpandLoading(true)

    try {
      const [matchRes, leaguesRes] = await Promise.all([
        fetch(`/api/matches/${match.id}`),
        fetch('/api/leagues'),
      ])
      const [matchData, leaguesData] = await Promise.all([
        matchRes.json(),
        leaguesRes.json(),
      ])

      const fullMatch = matchData.data?.match
      const leagues: { id: string }[] = leaguesData.data || []
      const leagueId = leagues[0]?.id

      if (!leagueId) {
        setExpandedMatchId(null)
        return
      }

      // find existing prediction for this league
      const preds = matchData.data?.predictions || []
      const existing = preds.find((p: { leagueId: string }) => p.leagueId === leagueId) || match.userPrediction || null

      setExpandedData({
        homeTeam: fullMatch.homeTeam,
        awayTeam: fullMatch.awayTeam,
        leagueId,
        existingPrediction: existing,
      })
    } finally {
      setExpandLoading(false)
    }
  }

  const handlePredictionSuccess = (matchId: string, result: { predictedHomeScore: number; predictedAwayScore: number }) => {
    setMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, userPrediction: { ...m.userPrediction, id: m.userPrediction?.id || '', predictedTopScorerPlayerId: null, ...result } }
        : m
    ))
    setExpandedMatchId(null)
    setExpandedData(null)
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
          ← חזרה
        </Link>
        <h1 className="text-white font-black text-xl">כל המשחקים</h1>
        <div className="w-12" />
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 justify-end">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveStatus(tab.value)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeStatus === tab.value
                ? 'bg-primary text-black'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📅</div>
          <p>אין משחקים להצגה</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id}>
              <MatchCard
                match={match}
                prediction={match.userPrediction}
                onPredictClick={() => handlePredictClick(match)}
              />
              {expandedMatchId === match.id && (
                <div className="mt-2 rounded-2xl overflow-hidden border border-primary/20">
                  {expandLoading || !expandedData ? (
                    <div className="bg-dark-card p-6 flex items-center justify-center">
                      <div className="text-2xl animate-bounce">⚽</div>
                    </div>
                  ) : (
                    <PredictionForm
                      matchId={match.id}
                      leagueId={expandedData.leagueId}
                      homeTeam={expandedData.homeTeam}
                      awayTeam={expandedData.awayTeam}
                      homePlayers={expandedData.homeTeam.players}
                      awayPlayers={expandedData.awayTeam.players}
                      existingPrediction={expandedData.existingPrediction}
                      isLocked={false}
                      onSuccess={(result) => handlePredictionSuccess(match.id, result)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
