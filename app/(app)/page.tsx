'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MatchCard } from '@/components/match-card'
import { LeagueTable } from '@/components/league-table'
import { Onboarding } from '@/components/onboarding'

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
  minute?: number | null
  round?: string | null
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; x2Applied?: boolean; shinooApplied?: boolean } | null
  memberPredictions?: { id: string; predictedHomeScore: number; predictedAwayScore: number; user: { id: string; username: string } }[]
  powerupUsage?: { x2Used: number; shinooUsed: number } | null
}

interface StandingEntry {
  rank: number
  userId: string
  username: string
  role: string
  totalPoints: number
  predictionCount: number
  wrong: number
  outcomeOnly: number
  outcomeAndOne: number
  exactScores: number
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
  const [powerupLoading, setPowerupLoading] = useState<string | null>(null)
  const [shinooModal, setShinooModal] = useState<Match | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
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
    if (localStorage.getItem('show_onboarding') === '1') {
      setShowOnboarding(true)
      localStorage.removeItem('show_onboarding')
    }
  }, [])

  useEffect(() => {
    pollLiveSync() // sync immediately on mount
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

  const applyX2 = async (match: Match) => {
    if (!match.userPrediction) return
    setPowerupLoading(`x2-${match.id}`)
    const res = await fetch('/api/predictions/x2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      toast.success(`X2 הופעל!`)
      if (primaryLeague) fetchPrimaryLeague(primaryLeague.id)
    } else {
      toast.error(data.error || 'שגיאה')
    }
  }

  const applyShinoo = async (match: Match, team: 'home' | 'away', delta: 1 | -1) => {
    if (!match.userPrediction) return
    setPowerupLoading(`shinoo-${match.id}`)
    const res = await fetch('/api/predictions/shinoo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id, team, delta }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      toast.success(`שינוי הופעל!`)
      if (primaryLeague) fetchPrimaryLeague(primaryLeague.id)
    } else {
      toast.error(data.error || 'שגיאה')
    }
  }

  const liveMatchCount = primaryLeague?.matches.filter(m => ['LIVE', 'PAUSED'].includes(m.status)).length ?? 0

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

      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}

      {/* SHINOO modal */}
      {shinooModal && shinooModal.userPrediction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setShinooModal(null)}>
          <div className="bg-dark-card border border-dark-border rounded-t-3xl p-6 w-full max-w-sm pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg text-center mb-1">שינוי</h3>
            <p className="text-gray-500 text-xs text-center mb-6">שנה את הניחוש שלך ב-1 גול</p>
            <div className="flex gap-3 mb-3">
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-white text-sm font-bold text-center">{shinooModal.homeTeam.nameHe}</p>
                <button onClick={() => { applyShinoo(shinooModal, 'home', 1); setShinooModal(null) }} disabled={!!powerupLoading} className="py-3 rounded-2xl bg-yellow-500/20 border border-yellow-400 text-yellow-400 font-black text-xl active:scale-95 transition-all">+1</button>
                <button onClick={() => { applyShinoo(shinooModal, 'home', -1); setShinooModal(null) }} disabled={(shinooModal.userPrediction?.predictedHomeScore ?? 0) <= 0 || !!powerupLoading} className="py-3 rounded-2xl bg-yellow-500/20 border border-yellow-400 text-yellow-400 font-black text-xl active:scale-95 transition-all disabled:opacity-30">-1</button>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <p className="text-white text-sm font-bold text-center">{shinooModal.awayTeam.nameHe}</p>
                <button onClick={() => { applyShinoo(shinooModal, 'away', 1); setShinooModal(null) }} disabled={!!powerupLoading} className="py-3 rounded-2xl bg-yellow-500/20 border border-yellow-400 text-yellow-400 font-black text-xl active:scale-95 transition-all">+1</button>
                <button onClick={() => { applyShinoo(shinooModal, 'away', -1); setShinooModal(null) }} disabled={(shinooModal.userPrediction?.predictedAwayScore ?? 0) <= 0 || !!powerupLoading} className="py-3 rounded-2xl bg-yellow-500/20 border border-yellow-400 text-yellow-400 font-black text-xl active:scale-95 transition-all disabled:opacity-30">-1</button>
              </div>
            </div>
            <button onClick={() => setShinooModal(null)} className="w-full py-3 rounded-2xl bg-dark-50 border border-dark-border text-gray-500 font-medium text-sm mt-2">ביטול</button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="mb-6">
        {/* Top row: יציאה on the left */}
        <div className="flex justify-start">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
            className="text-sm font-medium text-gray-300 bg-dark-card border border-dark-border px-3 py-1.5 rounded-xl hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            יציאה
          </button>
        </div>

        {/* Logo centered */}
        <div className="flex justify-center -mt-1">
          <img src="/shinoo-title.png" alt="SHINOO" className="h-40 w-auto" style={{ mixBlendMode: 'lighten' }} />
        </div>

        {/* Bottom row: league name left, update info right */}
        <div className="flex items-center justify-between mt-1">
          {primaryLeague ? (
            <div className="flex items-center gap-1.5">
              {liveMatchCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  {liveMatchCount} חי
                </span>
              )}
              <span className="text-xs text-gray-400 font-medium">{primaryLeague.name}</span>
            </div>
          ) : <span />}
          <span className="text-xs text-gray-600">
            {lastUpdated ? `עודכן ${lastUpdated.getHours().toString().padStart(2, '0')}:${lastUpdated.getMinutes().toString().padStart(2, '0')}` : ''}
          </span>
        </div>
      </header>

      {leagues.length > 0 && primaryLeague ? (
        <>
          {/* Primary League Standings */}
          <section className="mb-6">
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

          {/* Live Matches */}
          {primaryLeague.matches.filter(m => ['LIVE', 'PAUSED'].includes(m.status)).length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  עכשיו
                </span>
                <h2 className="text-white font-bold text-lg">משחקים חיים</h2>
              </div>
              <div className="space-y-3">
                {primaryLeague.matches.filter(m => ['LIVE', 'PAUSED'].includes(m.status)).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={match.userPrediction}
                    memberPredictions={match.memberPredictions}
                    leagueId={primaryLeague.id}
                    powerup={match.userPrediction ? {
                      predictionId: match.userPrediction.id,
                      x2Applied: !!match.userPrediction.x2Applied,
                      shinooApplied: !!match.userPrediction.shinooApplied,
                      usage: match.powerupUsage || null,
                      onX2: () => applyX2(match),
                      onShinoo: () => setShinooModal(match),
                      loading: powerupLoading,
                    } : null}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Matches */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link href="/matches" className="text-primary text-sm font-medium">
                הכל ←
              </Link>
              <h2 className="text-white font-bold text-lg">משחקים קרובים</h2>
            </div>

            {primaryLeague.matches.filter(m => !['LIVE', 'PAUSED'].includes(m.status)).length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-4xl mb-3">📅</div>
                <p>אין משחקים מתוכננים כרגע</p>
              </div>
            ) : (
              <div className="space-y-3">
                {primaryLeague.matches.filter(m => !['LIVE', 'PAUSED'].includes(m.status)).slice(0, 5).map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={match.userPrediction}
                    memberPredictions={match.memberPredictions}
                    leagueId={primaryLeague.id}
                    powerup={match.userPrediction ? {
                      predictionId: match.userPrediction.id,
                      x2Applied: !!match.userPrediction.x2Applied,
                      shinooApplied: !!match.userPrediction.shinooApplied,
                      usage: match.powerupUsage || null,
                      onX2: () => applyX2(match),
                      onShinoo: () => setShinooModal(match),
                      loading: powerupLoading,
                    } : null}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <>
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
