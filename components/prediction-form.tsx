'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface Player {
  id: string
  nameHe: string
  nameEn: string
}

interface Team {
  nameHe: string
  code: string
}

interface PredictionFormProps {
  matchId: string
  leagueId: string
  homeTeam: Team
  awayTeam: Team
  homePlayers: Player[]
  awayPlayers: Player[]
  existingPrediction?: {
    id: string
    predictedHomeScore: number
    predictedAwayScore: number
    predictedTopScorerPlayerId?: string | null
  }
  isLocked: boolean
  onSuccess?: (prediction: { predictedHomeScore: number; predictedAwayScore: number }) => void
}

export function PredictionForm({
  matchId,
  leagueId,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  existingPrediction,
  isLocked,
  onSuccess,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState<string>(
    existingPrediction?.predictedHomeScore?.toString() ?? ''
  )
  const [awayScore, setAwayScore] = useState<string>(
    existingPrediction?.predictedAwayScore?.toString() ?? ''
  )
  const [topScorerId, setTopScorerId] = useState<string>(
    existingPrediction?.predictedTopScorerPlayerId ?? ''
  )
  const [loading, setLoading] = useState(false)

  const allPlayers = [...homePlayers, ...awayPlayers]

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (homeScore === '' || awayScore === '') {
        toast.error('יש להזין תוצאה מנוחשת לשתי הקבוצות')
        return
      }

      const home = parseInt(homeScore, 10)
      const away = parseInt(awayScore, 10)

      if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
        toast.error('תוצאה לא תקינה')
        return
      }

      setLoading(true)

      try {
        const endpoint = existingPrediction
          ? `/api/predictions/${existingPrediction.id}`
          : '/api/predictions'

        const method = existingPrediction ? 'PUT' : 'POST'

        const body: Record<string, unknown> = {
          predictedHomeScore: home,
          predictedAwayScore: away,
          predictedTopScorerPlayerId: topScorerId || null,
        }

        if (!existingPrediction) {
          body.matchId = matchId
          body.leagueId = leagueId
        }

        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data = await res.json()

        if (!res.ok) {
          toast.error(data.error || 'שגיאה בשמירת הניחוש')
          return
        }

        toast.success(data.message || 'הניחוש נשמר!')
        onSuccess?.({ predictedHomeScore: home, predictedAwayScore: away })
      } catch (err) {
        toast.error('שגיאת חיבור')
      } finally {
        setLoading(false)
      }
    },
    [homeScore, awayScore, topScorerId, matchId, leagueId, existingPrediction, onSuccess]
  )

  if (isLocked) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
        <h3 className="text-white font-bold text-lg mb-4 text-center">הניחוש שלי</h3>
        {existingPrediction ? (
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">{homeTeam.nameHe}</div>
              <div className="text-4xl font-black text-white">{existingPrediction.predictedHomeScore}</div>
            </div>
            <div className="text-gray-500 text-2xl font-bold">-</div>
            <div className="text-center">
              <div className="text-gray-400 text-xs mb-1">{awayTeam.nameHe}</div>
              <div className="text-4xl font-black text-white">{existingPrediction.predictedAwayScore}</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center">לא הגשת ניחוש למשחק זה</p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-2xl p-5">
      {/* Score Inputs */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">{homeTeam.nameHe}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="0"
            className="w-20 h-16 text-center text-3xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none transition-colors"
            disabled={loading}
          />
        </div>

        <span className="text-gray-500 text-2xl font-bold mt-6">-</span>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">{awayTeam.nameHe}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="0"
            className="w-20 h-16 text-center text-3xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || homeScore === '' || awayScore === ''}
        className="w-full bg-primary text-black font-black text-2xl py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '...' : '✓'}
      </button>
    </form>
  )
}
