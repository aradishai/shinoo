'use client'

import { useState, useCallback, useEffect } from 'react'
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
  existingCoinBet?: number | null
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
  existingCoinBet,
  isLocked,
  onSuccess,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState<string>(
    existingPrediction?.predictedHomeScore?.toString() ?? '0'
  )
  const [awayScore, setAwayScore] = useState<string>(
    existingPrediction?.predictedAwayScore?.toString() ?? '0'
  )
  const [topScorerId, setTopScorerId] = useState<string>(
    existingPrediction?.predictedTopScorerPlayerId ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [userCoins, setUserCoins] = useState<number>(0)
  const [coinBet, setCoinBet] = useState<number>(0)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUserCoins(d.data?.coins ?? 0))
  }, [])

  const allPlayers = [...homePlayers, ...awayPlayers]

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      const home = parseInt(homeScore || '0', 10)
      const away = parseInt(awayScore || '0', 10)

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
          coinBet,
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

        if (data.coins !== undefined) setUserCoins(data.coins)
        toast.success(coinBet > 0 ? `הניחוש נשמר! הימרת 🪙${coinBet}` : 'הניחוש נשמר!')
        onSuccess?.({ predictedHomeScore: home, predictedAwayScore: away })
      } catch {
        toast.error('שגיאת חיבור')
      } finally {
        setLoading(false)
      }
    },
    [homeScore, awayScore, topScorerId, coinBet, matchId, leagueId, existingPrediction, onSuccess]
  )

  if (isLocked) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
        <h3 className="text-white font-bold text-lg mb-4 text-center">הניחוש שלי</h3>
        {existingPrediction ? (
          <div>
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
            {existingCoinBet != null && existingCoinBet > 0 && (
              <p className="text-center text-yellow-400 text-sm mt-3">🪙 הימרת {existingCoinBet} מטבעות</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center">לא הגשת ניחוש למשחק זה</p>
        )}
      </div>
    )
  }

  const alreadyBet = existingPrediction && (existingCoinBet ?? 0) > 0

  return (
    <form onSubmit={handleSubmit} className="bg-dark-card border border-dark-border rounded-2xl p-5">
      {/* Score Inputs */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {/* Home */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">{homeTeam.nameHe}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={loading} onClick={() => setHomeScore(s => String(Math.max(0, parseInt(s||'0') - 1)))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40">−</button>
            <span className="w-10 text-center text-3xl font-black text-white">{homeScore === '' ? '0' : homeScore}</span>
            <button type="button" disabled={loading} onClick={() => setHomeScore(s => String(Math.min(20, parseInt(s||'0') + 1)))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40">+</button>
          </div>
        </div>

        <span className="text-gray-600 text-2xl font-bold mt-6">:</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">{awayTeam.nameHe}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={loading} onClick={() => setAwayScore(s => String(Math.max(0, parseInt(s||'0') - 1)))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40">−</button>
            <span className="w-10 text-center text-3xl font-black text-white">{awayScore === '' ? '0' : awayScore}</span>
            <button type="button" disabled={loading} onClick={() => setAwayScore(s => String(Math.min(20, parseInt(s||'0') + 1)))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all disabled:opacity-40">+</button>
          </div>
        </div>
      </div>

      {/* Coin Bet */}
      {!alreadyBet && userCoins > 0 && (
        <div className="mb-5 bg-dark-50 border border-dark-border rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-xs">יתרה: 🪙 {userCoins}</span>
            <span className="text-yellow-400 text-sm font-bold">הימור מטבעות</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCoinBet(c => Math.max(0, c - 1))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all"
            >
              −
            </button>
            <span className="text-white font-black text-2xl w-12 text-center">🪙{coinBet}</span>
            <button
              type="button"
              onClick={() => setCoinBet(c => Math.min(userCoins, c + 1))}
              className="w-9 h-9 rounded-full bg-dark-card border border-dark-border text-white font-bold text-lg active:scale-95 transition-all"
            >
              +
            </button>
          </div>
          {coinBet > 0 && (
            <p className="text-center text-gray-500 text-xs mt-2">
              ניצחון → עד 🪙{5 * coinBet} | הפסד → מאבד 🪙{coinBet}
            </p>
          )}
        </div>
      )}

      {alreadyBet && (
        <p className="text-center text-yellow-400 text-sm mb-4">🪙 הימרת {existingCoinBet} מטבעות</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-black font-black text-2xl py-4 rounded-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '...' : '✓'}
      </button>
    </form>
  )
}
