'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MatchCard } from '@/components/match-card'
import { LeagueTable } from '@/components/league-table'

interface User {
  id: string
  username: string
}

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

interface StandingEntry {
  rank: number
  userId: string
  username: string
  role: string
  totalPoints: number
  correctPredictions: number
  exactScores: number
  predictionCount: number
}

interface LeagueSummary {
  id: string
  name: string
  inviteCode: string
  memberCount: number
  userRank: number
  userPoints: number
  role?: string
}

interface LeagueDetail {
  id: string
  name: string
  inviteCode: string
  standings: StandingEntry[]
  matches: Match[]
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [primaryLeague, setPrimaryLeague] = useState<LeagueDetail | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [joiningLeague, setJoiningLeague] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrimaryLeague = useCallback(async (leagueId: string) => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}`)
      if (!res.ok) return
      const data = await res.json()
      setPrimaryLeague(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [meRes, leaguesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/leagues'),
      ])

      if (!meRes.ok) {
        router.push('/login')
        return
      }

      const [meData, leaguesData] = await Promise.all([
        meRes.json(),
        leaguesRes.json(),
      ])

      setUser(meData.data)
      const leagueList: LeagueSummary[] = leaguesData.data || []
      setLeagues(leagueList)

      if (leagueList.length > 0) {
        await fetchPrimaryLeague(leagueList[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router, fetchPrimaryLeague])

  // Live sync polling — refresh data after sync reports active matches
  const pollLiveSync = useCallback(async () => {
    if (!primaryLeague) return
    try {
      const res = await fetch('/api/sync/live')
      const data = await res.json()
      if (data.synced && primaryLeague) {
        await fetchPrimaryLeague(primaryLeague.id)
      }
    } catch {
      // silent fail — live sync is best-effort
    }
  }, [primaryLeague, fetchPrimaryLeague])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    syncIntervalRef.current = setInterval(pollLiveSync, 60_000)
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [pollLiveSync])

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setJoiningLeague(true)
    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהצטרפות')
        return
      }

      toast.success(data.message || 'הצטרפת לליגה!')
      setInviteCode('')
      router.push(`/leagues/${data.data.leagueId}`)
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setJoiningLeague(false)
    }
  }

  const liveMatchCount = primaryLeague?.matches.filter(m => m.status === 'LIVE').length ?? 0

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

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
          }}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          יציאה
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight" dir="ltr">
            <span className="text-white">SH</span>
            <span className="text-primary">I</span>
            <span className="text-white">N</span>
            <span className="text-primary">O</span>
            <span className="text-white">O</span>
            <span className="text-secondary">!</span>
          </h1>
          <p className="text-gray-500 text-xs">שלום, {user?.username}! 👋</p>
        </div>
        <div className="w-12" />
      </header>

      {leagues.length > 0 && primaryLeague ? (
        <>
          {/* Primary League Standings */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/leagues/${primaryLeague.id}`} className="text-primary text-sm font-medium">
                הכל ←
              </Link>
              <div className="text-right">
                <h2 className="text-white font-bold text-lg">{primaryLeague.name}</h2>
                <div className="flex items-center justify-end gap-2">
                  {liveMatchCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                      {liveMatchCount} חי
                    </span>
                  )}
                  {lastUpdated && (
                    <span className="text-xs text-gray-600">
                      עודכן {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <LeagueTable
              standings={primaryLeague.standings}
              currentUserId={user?.id}
            />
          </section>

          {/* League switcher (if more than 1 league) */}
          {leagues.length > 1 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={`/leagues/${league.id}`}
                  className="flex-shrink-0 text-xs bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-gray-400 hover:border-primary/40 hover:text-white transition-all"
                >
                  {league.name}
                </Link>
              ))}
            </div>
          )}

          {/* Upcoming Matches */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link href="/matches" className="text-primary text-sm font-medium">
                הכל ←
              </Link>
              <h2 className="text-white font-bold text-lg">משחקים קרובים</h2>
            </div>

            {primaryLeague.matches.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-4xl mb-3">📅</div>
                <p>אין משחקים מתוכננים כרגע</p>
              </div>
            ) : (
              <div className="space-y-3">
                {primaryLeague.matches.slice(0, 5).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={match.userPrediction}
                    leagueId={primaryLeague.id}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          {/* No leagues — World Cup Banner + Join */}
          <div className="relative bg-gradient-to-l from-primary/20 to-secondary/10 border border-primary/20 rounded-2xl p-4 mb-8 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 bottom-0 opacity-5 text-8xl flex items-center justify-center select-none pointer-events-none">
              🏆
            </div>
            <div className="relative z-10 text-right">
              <p className="text-xs text-primary font-medium mb-1">בחסות הבאילינדוז</p>
              <h2 className="text-white font-black text-lg">מונדיאל 2026</h2>
              <p className="text-gray-400 text-xs mt-1">כעת חייה בוקובזה</p>
            </div>
          </div>

          {/* Join League */}
          <section className="mb-6">
            <h2 className="text-white font-bold text-lg mb-4 text-right">הצטרף לליגה</h2>
            <form onSubmit={handleJoinLeague} className="flex gap-2">
              <button
                type="submit"
                disabled={joiningLeague || !inviteCode.trim()}
                className="bg-primary text-black font-bold px-5 py-3 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {joiningLeague ? '...' : 'הצטרף'}
              </button>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="קוד הזמנה (8 תווים)"
                maxLength={8}
                className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none text-right"
              />
            </form>
          </section>

          <section className="mb-8">
            <Link
              href="/leagues/create"
              className="block bg-dark-card border border-dark-border hover:border-primary/30 rounded-2xl p-5 text-center transition-all group"
            >
              <h3 className="text-white font-bold mb-1 group-hover:text-primary transition-colors">
                צור ליגה חדשה
              </h3>
              <p className="text-gray-500 text-sm">הזמן חברים ותתחרו ביניכם</p>
            </Link>
          </section>
        </>
      )}

      {/* Join league (even if already in one) */}
      {leagues.length > 0 && (
        <section className="mb-6">
          <h2 className="text-white font-bold text-base mb-3 text-right">הצטרף לליגה נוספת</h2>
          <form onSubmit={handleJoinLeague} className="flex gap-2">
            <button
              type="submit"
              disabled={joiningLeague || !inviteCode.trim()}
              className="bg-dark-card border border-dark-border text-white font-bold px-4 py-2.5 rounded-xl hover:border-primary/40 active:scale-95 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {joiningLeague ? '...' : 'הצטרף'}
            </button>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="קוד הזמנה"
              maxLength={8}
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:border-primary focus:outline-none text-right text-sm"
            />
          </form>
        </section>
      )}
    </div>
  )
}
