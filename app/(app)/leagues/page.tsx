'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LeagueCard } from '@/components/league-card'

interface League {
  id: string
  name: string
  inviteCode: string
  memberCount: number
  userRank: number
  userPoints: number
  role?: string
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leagues')
      .then((r) => r.json())
      .then((data) => setLeagues(data.data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/leagues/create"
          className="bg-primary text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-400 active:scale-95 transition-all"
        >
          + ליגה
        </Link>
        <h1 className="text-white font-black text-2xl">הליגות שלי</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-16">
          
          <h2 className="text-white font-bold text-xl mb-2">אין לך ליגות עדיין</h2>
          <p className="text-gray-500 mb-8">צור ליגה ראשונה והזמן חברים</p>
          <Link
            href="/leagues/create"
            className="bg-primary text-black font-black px-8 py-4 rounded-xl hover:bg-primary-400 active:scale-95 transition-all shadow-green inline-block"
          >
            צור ליגה ראשונה
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {leagues.map((league) => (
            <LeagueCard key={league.id} league={league} />
          ))}

          {/* Create more */}
          <Link
            href="/leagues/create"
            className="block border-2 border-dashed border-dark-border rounded-2xl p-6 text-center text-gray-500 hover:border-primary/30 hover:text-primary transition-all"
          >
            + צור ליגה נוספת
          </Link>
        </div>
      )}
    </div>
  )
}
