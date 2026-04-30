'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface HistoryEntry {
  id: string
  predictedHomeScore: number
  predictedAwayScore: number
  x2Applied: boolean
  match: {
    round: string | null
    kickoffAt: string
    homeScore: number | null
    awayScore: number | null
    homeTeam: { nameHe: string; code: string; flagUrl?: string | null }
    awayTeam: { nameHe: string; code: string; flagUrl?: string | null }
  }
  points: {
    resultPoints: number
    totalPoints: number
  } | null
}

function PointsBadge({ pts }: { pts: number }) {
  if (pts >= 5) return <span className="text-green-400 font-black text-base">{pts}</span>
  if (pts >= 3) return <span className="text-blue-400 font-black text-base">{pts}</span>
  if (pts >= 1) return <span className="text-yellow-400 font-black text-base">{pts}</span>
  return <span className="text-red-500 font-black text-base">0</span>
}

function rowBorder(pts: number) {
  if (pts >= 5) return 'border-green-500/30 bg-green-500/5'
  if (pts >= 3) return 'border-blue-500/30 bg-blue-500/5'
  if (pts >= 1) return 'border-yellow-500/30 bg-yellow-500/5'
  return 'border-dark-border'
}

export default function HistoryPage() {
  const params = useParams()
  const leagueId = params.id as string
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/leagues/${leagueId}/history`)
      .then(r => r.json())
      .then(d => setHistory(d.data || []))
      .finally(() => setLoading(false))
  }, [leagueId])

  const totalPoints = history.reduce((s, h) => s + (h.points?.totalPoints || 0), 0)
  const exact = history.filter(h => (h.points?.resultPoints || 0) >= 5).length
  const correct = history.filter(h => (h.points?.resultPoints || 0) >= 1).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">טוען...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/leagues/${leagueId}`} className="text-gray-400 hover:text-white transition-colors">
          ← חזרה
        </Link>
        <h1 className="text-white font-black text-xl">היסטוריית ניחושים</h1>
        <div className="w-12" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
          <p className="text-primary font-black text-2xl">{totalPoints}</p>
          <p className="text-gray-500 text-xs mt-1">נקודות</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
          <p className="text-green-400 font-black text-2xl">{exact}</p>
          <p className="text-gray-500 text-xs mt-1">בול</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
          <p className="text-yellow-400 font-black text-2xl">{correct}</p>
          <p className="text-gray-500 text-xs mt-1">מנחש נכון</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p>אין ניחושים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map(entry => {
            const pts = entry.points?.totalPoints || 0
            return (
              <div key={entry.id} className={`rounded-xl border p-3 ${rowBorder(pts)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PointsBadge pts={pts} />
                    <span className="text-gray-600 text-xs">נק'</span>
                  </div>
                  <span className="text-gray-500 text-xs">{entry.match.round || ''}</span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  {/* Home */}
                  <div className="flex items-center gap-1.5 flex-1">
                    {entry.match.homeTeam.flagUrl ? (
                      <img src={entry.match.homeTeam.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs">{entry.match.homeTeam.code}</span>
                    )}
                    <span className="text-white text-xs font-bold">{entry.match.homeTeam.nameHe}</span>
                  </div>

                  {/* Scores */}
                  <div className="flex flex-col items-center mx-2 gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-black text-sm">{entry.match.homeScore}</span>
                      <span className="text-gray-600 text-xs">:</span>
                      <span className="text-white font-black text-sm">{entry.match.awayScore}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 text-xs">{entry.predictedHomeScore}</span>
                      <span className="text-gray-600 text-xs">:</span>
                      <span className="text-gray-500 text-xs">{entry.predictedAwayScore}</span>
                    </div>
                  </div>

                  {/* Away */}
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <span className="text-white text-xs font-bold">{entry.match.awayTeam.nameHe}</span>
                    {entry.match.awayTeam.flagUrl ? (
                      <img src={entry.match.awayTeam.flagUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <span className="text-xs">{entry.match.awayTeam.code}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
