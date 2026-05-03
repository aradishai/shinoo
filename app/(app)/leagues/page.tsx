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

interface GlobalStanding {
  userId: string
  username: string
  totalPoints: number
  exactScores: number
  predictionCount: number
  rank: number
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [globalStandings, setGlobalStandings] = useState<GlobalStanding[]>([])
  const [tournamentName, setTournamentName] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showAllGlobal, setShowAllGlobal] = useState(false)

  useEffect(() => {
    fetch('/api/leagues')
      .then((r) => r.json())
      .then((data) => setLeagues(data.data || []))
      .finally(() => setLoading(false))

    fetch('/api/leagues/global-standings')
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setGlobalStandings(data.data.standings || [])
          setTournamentName(data.data.tournamentName || null)
        }
      })

    // Get current user id from session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.user?.id || null))
  }, [])

  const VISIBLE_COUNT = 10
  const myEntry = globalStandings.find((s) => s.userId === currentUserId)
  const visibleStandings = showAllGlobal ? globalStandings : globalStandings.slice(0, VISIBLE_COUNT)
  const myRankOutside = myEntry && !showAllGlobal && (myEntry.rank > VISIBLE_COUNT)

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

      {/* Global World Cup Leaderboard */}
      {tournamentName && globalStandings.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-end gap-2 mb-3">
            <h2 className="text-white font-black text-lg">🌍 דירוג {tournamentName}</h2>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center px-4 py-2 border-b border-dark-border text-gray-500 text-xs">
              <span className="text-center">#</span>
              <span className="text-right">שחקן</span>
              <span className="text-center w-10">מדויק</span>
              <span className="text-center w-12">נקודות</span>
            </div>

            {visibleStandings.map((entry) => {
              const isMe = entry.userId === currentUserId
              const medalMap: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
              const medal = medalMap[entry.rank]
              return (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-[2rem_1fr_auto_auto] items-center px-4 py-3 border-b border-dark-border/50 last:border-0 ${isMe ? 'bg-primary/10' : ''}`}
                >
                  <span className="text-center text-sm font-bold text-gray-400">
                    {medal || entry.rank}
                  </span>
                  <span
                    className={`text-right text-sm font-bold truncate ${isMe ? 'text-primary' : 'text-white'}`}
                    dir="rtl"
                  >
                    {entry.username}
                    {isMe && <span className="text-xs text-gray-500 font-normal mr-1">(את/ה)</span>}
                  </span>
                  <span className="text-center text-xs text-gray-400 w-10">{entry.exactScores}</span>
                  <span className={`text-center text-sm font-black w-12 ${isMe ? 'text-primary' : 'text-white'}`}>
                    {entry.totalPoints}
                  </span>
                </div>
              )
            })}

            {/* My rank if outside visible range */}
            {myRankOutside && myEntry && (
              <>
                <div className="px-4 py-1 text-center text-gray-600 text-xs">•••</div>
                <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center px-4 py-3 bg-primary/10">
                  <span className="text-center text-sm font-bold text-gray-400">{myEntry.rank}</span>
                  <span className="text-right text-sm font-bold text-primary truncate" dir="rtl">
                    {myEntry.username}
                    <span className="text-xs text-gray-500 font-normal mr-1">(את/ה)</span>
                  </span>
                  <span className="text-center text-xs text-gray-400 w-10">{myEntry.exactScores}</span>
                  <span className="text-center text-sm font-black text-primary w-12">{myEntry.totalPoints}</span>
                </div>
              </>
            )}

            {/* Show more / less */}
            {globalStandings.length > VISIBLE_COUNT && (
              <button
                onClick={() => setShowAllGlobal(!showAllGlobal)}
                className="w-full py-3 text-sm text-gray-500 hover:text-primary transition-colors border-t border-dark-border/50"
              >
                {showAllGlobal ? 'הצג פחות ▲' : `הצג את כל ${globalStandings.length} השחקנים ▼`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* My Leagues */}
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
