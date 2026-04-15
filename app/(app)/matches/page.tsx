'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MatchCard } from '@/components/match-card'

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
  userPrediction?: { predictedHomeScore: number; predictedAwayScore: number } | null
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

  useEffect(() => {
    setLoading(true)
    const url = activeStatus ? `/api/matches?status=${activeStatus}` : '/api/matches'
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMatches(data.data || []))
      .finally(() => setLoading(false))
  }, [activeStatus])

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
            <MatchCard
              key={match.id}
              match={match}
              prediction={match.userPrediction}
            />
          ))}
        </div>
      )}
    </div>
  )
}
