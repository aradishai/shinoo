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
  isAdmin?: boolean
  x2Stock?: number
  shinooStock?: number
  x3Stock?: number
  goalsStock?: number
  minute90Stock?: number
  splitStock?: number
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
  tournament?: { type: string } | null
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; x2Applied?: boolean; shinooApplied?: boolean; x3Applied?: boolean; goalsApplied?: boolean; minute90Applied?: boolean; splitApplied?: boolean; splitHomeScore2?: number | null; splitAwayScore2?: number | null } | null
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

interface Minute90RevealData {
  homeTeam: string
  awayTeam: string
  newHome: number
  newAway: number
}

const SLOT_ITEM_H = 80
const SLOT_SEQUENCE = [0,1,2,3,4,5,0,1,2,3,4,5,0,1,2,3,4,5]

function SlotDigit({ target, onDone, delay = 0 }: { target: number; onDone?: () => void; delay?: number }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const sequence = [...SLOT_SEQUENCE, target]

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.style.transition = 'none'
    el.style.transform = 'translateY(0px)'
    el.getBoundingClientRect() // force reflow

    const start = setTimeout(() => {
      el.style.transition = `transform 5s cubic-bezier(0.12, 0.8, 0.2, 1)`
      el.style.transform = `translateY(-${(sequence.length - 1) * SLOT_ITEM_H}px)`
    }, delay)

    const done = setTimeout(() => onDone?.(), delay + 5100)
    return () => { clearTimeout(start); clearTimeout(done) }
  }, [])

  return (
    <div style={{ height: SLOT_ITEM_H, overflow: 'hidden', width: 64 }}>
      <div ref={trackRef}>
        {sequence.map((n, i) => (
          <div key={i} style={{ height: SLOT_ITEM_H }} className="flex items-center justify-center">
            <span className="text-7xl font-black tabular-nums text-white leading-none">{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Minute90RevealModal({ data, onClose }: { data: Minute90RevealData; onClose: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const doneCount = useRef(0)

  const handleSlotDone = () => {
    doneCount.current++
    if (doneCount.current >= 2) setRevealed(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6" dir="rtl">
      <div className="bg-dark-card border border-dark-border rounded-3xl w-full max-w-sm text-center shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">דקה 90′</p>
          <p className="text-white font-black text-lg">הניחוש החדש שלך</p>
        </div>

        {/* Scoreboard */}
        <div className="bg-black/40 mx-4 rounded-2xl px-4 py-5 mb-4 border border-white/5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-gray-300 text-sm font-bold text-right flex-1 leading-snug">{data.homeTeam}</span>
            <span className="text-gray-300 text-sm font-bold text-left flex-1 leading-snug">{data.awayTeam}</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <SlotDigit target={data.newHome} onDone={handleSlotDone} delay={0} />
            <span className="text-5xl font-black text-gray-500 leading-none mb-1">:</span>
            <SlotDigit target={data.newAway} onDone={handleSlotDone} delay={150} />
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 pb-8">
          {revealed ? (
            <button
              onClick={onClose}
              className="w-full bg-primary text-black font-black text-lg py-3.5 rounded-2xl active:scale-95 transition-all"
            >
              יאללה! 🎯
            </button>
          ) : (
            <div className="py-3 text-gray-600 text-sm">מגריל...</div>
          )}
        </div>
      </div>
    </div>
  )
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
  const [splitModal, setSplitModal] = useState<Match | null>(null)
  const [splitScores, setSplitScores] = useState({ home: '0', away: '0' })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [minute90Reveal, setMinute90Reveal] = useState<Minute90RevealData | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPage, setMenuPage] = useState<'rules' | 'privacy' | 'terms' | 'contact' | 'account' | null>(null)
  const [accountUsername, setAccountUsername] = useState('')
  const [accountCurPass, setAccountCurPass] = useState('')
  const [accountNewPass, setAccountNewPass] = useState('')
  const [accountMsg, setAccountMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)
  const [adminUsers, setAdminUsers] = useState<{
    id: string; username: string; coins: number; createdAt: string
    managedLeagues: { id: string; name: string; memberCount: number }[]
    joinedLeaguesCount: number
  }[]>([])
  const [adminFilter, setAdminFilter] = useState<'all' | 'managers'>('all')
  const [resetLeagueName, setResetLeagueName] = useState('')
  const [resetLeagueLoading, setResetLeagueLoading] = useState(false)
  const [interestCounts, setInterestCounts] = useState<{ league: string; count: number }[]>([])
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isAdmin = user?.isAdmin ?? false

  const openAdminPanel = async () => {
    const [usersRes, interestsRes] = await Promise.all([
      fetch('/api/admin/users'),
      fetch('/api/admin/interests'),
    ])
    if (usersRes.ok) {
      const data = await usersRes.json()
      setAdminUsers(data.users)
    }
    if (interestsRes.ok) {
      const data = await interestsRes.json()
      setInterestCounts(data.interests)
    }
    setShowAdminPanel(true)
  }

  const resetLeague = async () => {
    if (!resetLeagueName.trim()) return
    if (!confirm(`לאפס את ליגת "${resetLeagueName}"? כל הניחושים והנקודות יימחקו.`)) return
    setResetLeagueLoading(true)
    try {
      const res = await fetch('/api/admin/reset-league', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName: resetLeagueName.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`אופסה ליגת "${data.league}" — נמחקו ${data.deleted} ניחושים`)
        setResetLeagueName('')
      } else {
        alert(data.error || 'שגיאה')
      }
    } finally {
      setResetLeagueLoading(false)
    }
  }

  const deleteUser = async (id: string) => {
    if (!confirm('למחוק את המשתמש?')) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) setAdminUsers(u => u.filter(x => x.id !== id))
  }

  const shareApp = () => {
    if (navigator.share) {
      navigator.share({ title: 'שינו ⚽', text: 'פותחים ליגה עם חברים ומנחשים תוצאות משחקים — מונדיאל, ליגת אלופות, לה ליגה ופרמייר ליג ⚽\nהצטרף עכשיו:', url: 'https://shinoo-production-7ab8.up.railway.app' })
    } else {
      navigator.clipboard.writeText('https://shinoo-production-7ab8.up.railway.app')
      toast.success('הקישור הועתק!')
    }
  }

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
    syncIntervalRef.current = setInterval(pollLiveSync, 10_000)
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

  const powerupToast = (imgSrc: string) => {
    toast.custom((t) => (
      <div className={`flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl transition-opacity ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
        <img src={imgSrc} className="h-8 w-auto rounded-lg" style={{ mixBlendMode: 'lighten' }} />
        <span className="text-white font-black text-sm">הופעל</span>
        <span className="text-green-400 font-black text-base">✓</span>
      </div>
    ), { duration: 2000 })
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
    if (res.ok) { powerupToast('/btn-x2.png'); if (primaryLeague) fetchPrimaryLeague(primaryLeague.id) }
    else toast.error(data.error || 'שגיאה')
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
    if (res.ok) { powerupToast('/btn-shinoo.png'); if (primaryLeague) fetchPrimaryLeague(primaryLeague.id) }
    else toast.error(data.error || 'שגיאה')
  }

  const applyX3 = async (match: Match) => {
    if (!match.userPrediction) return
    setPowerupLoading(`x3-${match.id}`)
    const res = await fetch('/api/predictions/x3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) { powerupToast('/btn-x3.png'); if (primaryLeague) fetchPrimaryLeague(primaryLeague.id) }
    else toast.error(data.error || 'שגיאה')
  }

  const applyGoals = async (match: Match) => {
    if (!match.userPrediction) return
    setPowerupLoading(`goals-${match.id}`)
    const res = await fetch('/api/predictions/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) { powerupToast('/btn-goals.png'); if (primaryLeague) fetchPrimaryLeague(primaryLeague.id) }
    else toast.error(data.error || 'שגיאה')
  }

  const applyMinute90 = async (match: Match) => {
    if (!match.userPrediction) return
    setPowerupLoading(`90-${match.id}`)
    const res = await fetch('/api/predictions/minute90', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      setMinute90Reveal({
        homeTeam: match.homeTeam.nameHe,
        awayTeam: match.awayTeam.nameHe,
        newHome: data.newHome,
        newAway: data.newAway,
      })
      if (primaryLeague) fetchPrimaryLeague(primaryLeague.id)
    } else {
      setMinute90Reveal(null)
      toast.error(data.error || 'שגיאה')
    }
  }

  const applySplit = async (match: Match, splitHomeScore2: number, splitAwayScore2: number) => {
    if (!match.userPrediction) return
    setPowerupLoading(`split-${match.id}`)
    const res = await fetch('/api/predictions/split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id, splitHomeScore2, splitAwayScore2 }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) { powerupToast('/btn-split.png'); if (primaryLeague) fetchPrimaryLeague(primaryLeague.id) }
    else toast.error(data.error || 'שגיאה')
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

      {/* Minute 90 reveal modal */}
      {minute90Reveal && (
        <Minute90RevealModal
          data={minute90Reveal}
          onClose={() => setMinute90Reveal(null)}
        />
      )}

      {/* SPLIT modal */}
      {splitModal && splitModal.userPrediction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setSplitModal(null)}>
          <div className="bg-dark-card border border-dark-border rounded-t-3xl p-6 w-full max-w-sm pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg text-center mb-1">ספליט</h3>
            <p className="text-gray-500 text-xs text-center mb-1">הניחוש הראשון שלך: <span className="text-primary font-bold">{splitModal.userPrediction.predictedHomeScore}-{splitModal.userPrediction.predictedAwayScore}</span></p>
            <p className="text-gray-500 text-xs text-center mb-5">בחר תוצאה שנייה — המערכת תבחר את הטובה</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-white text-sm font-bold">{splitModal.homeTeam.nameHe}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSplitScores(s => ({ ...s, home: String(Math.max(0, parseInt(s.home) - 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">−</button>
                  <span className="w-8 text-center text-2xl font-black text-white">{splitScores.home}</span>
                  <button onClick={() => setSplitScores(s => ({ ...s, home: String(Math.min(20, parseInt(s.home) + 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">+</button>
                </div>
              </div>
              <span className="text-gray-500 font-bold mt-6">-</span>
              <div className="flex flex-col items-center gap-2">
                <span className="text-white text-sm font-bold">{splitModal.awayTeam.nameHe}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSplitScores(s => ({ ...s, away: String(Math.max(0, parseInt(s.away) - 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">−</button>
                  <span className="w-8 text-center text-2xl font-black text-white">{splitScores.away}</span>
                  <button onClick={() => setSplitScores(s => ({ ...s, away: String(Math.min(20, parseInt(s.away) + 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">+</button>
                </div>
              </div>
            </div>
            <button
              onClick={() => { applySplit(splitModal, parseInt(splitScores.home), parseInt(splitScores.away)); setSplitModal(null) }}
              disabled={!!powerupLoading}
              className="w-full py-3 rounded-2xl bg-yellow-500 text-black font-black text-sm mb-2 active:scale-95 transition-all"
            >
              אשר ספליט
            </button>
            <button onClick={() => setSplitModal(null)} className="w-full py-3 rounded-2xl bg-dark-50 border border-dark-border text-gray-500 font-medium text-sm">ביטול</button>
          </div>
        </div>
      )}

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
      {/* Admin panel */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-10 px-4" onClick={() => setShowAdminPanel(false)}>
          <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border">
              <h2 className="text-white font-black text-base">משתמשים ({adminUsers.length})</h2>
              <button onClick={() => setShowAdminPanel(false)} className="text-gray-500 text-xl">✕</button>
            </div>
            {/* Interests */}
            {interestCounts.length > 0 && (
              <div className="px-4 py-3 border-b border-dark-border/50">
                <p className="text-gray-500 font-black text-xs mb-2">ביקושי ליגות</p>
                <div className="space-y-1.5">
                  {interestCounts.map(({ league, count }) => {
                    const max = interestCounts[0].count
                    return (
                      <div key={league} className="flex items-center gap-2">
                        <span className="text-gray-300 text-xs w-28 text-right shrink-0">{league}</span>
                        <div className="flex-1 bg-dark-50 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-primary font-black text-xs w-5 text-left shrink-0">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Filter */}
            <div className="flex gap-2 px-4 py-2.5 border-b border-dark-border/50">
              <button
                onClick={() => setAdminFilter('all')}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${adminFilter === 'all' ? 'bg-primary text-black' : 'bg-dark-50 text-gray-400 border border-dark-border'}`}
              >כולם</button>
              <button
                onClick={() => setAdminFilter('managers')}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-all ${adminFilter === 'managers' ? 'bg-primary text-black' : 'bg-dark-50 text-gray-400 border border-dark-border'}`}
              >מנהלי ליגה</button>
            </div>
            {/* Reset league */}
            <div className="px-4 py-3 border-b border-dark-border/50 bg-red-900/10">
              <p className="text-red-400 font-black text-xs mb-2">איפוס ליגה</p>
              <div className="flex gap-2">
                <input
                  value={resetLeagueName}
                  onChange={e => setResetLeagueName(e.target.value)}
                  placeholder="שם הליגה"
                  className="flex-1 bg-dark-50 border border-dark-border rounded-lg px-3 py-1.5 text-white text-xs placeholder-gray-600 text-right"
                  dir="rtl"
                />
                <button
                  onClick={resetLeague}
                  disabled={resetLeagueLoading || !resetLeagueName.trim()}
                  className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-lg disabled:opacity-40 active:scale-95 transition-all"
                >
                  {resetLeagueLoading ? '...' : 'אפס'}
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {adminUsers
                .filter(u => adminFilter === 'all' || u.managedLeagues.length > 0)
                .map(u => (
                <div key={u.id} className={`px-4 py-3 border-b border-dark-border/50 ${u.managedLeagues.length > 0 ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-sm">{u.username}</p>
                      {u.managedLeagues.length > 0 && (
                        <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">מנהל</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="text-red-400 text-xs font-bold border border-red-400/30 px-2.5 py-1 rounded-lg active:scale-95 transition-all"
                    >מחק</button>
                  </div>
                  <p className="text-gray-500 text-xs mb-1">{u.coins} מטבעות · {u.joinedLeaguesCount} ליגות</p>
                  {u.managedLeagues.map(l => (
                    <div key={l.id} className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-primary text-[10px]">▸</span>
                      <span className="text-gray-300 text-xs">{l.name}</span>
                      <span className="text-gray-600 text-[10px]">({l.memberCount} חברים)</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {showMenu && !menuPage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setShowMenu(false)}>
          <div className="bg-dark-card border border-dark-border rounded-t-3xl w-full max-w-sm pb-8 pt-4 overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="w-10 h-1 bg-dark-border rounded-full mx-auto mb-4" />
            {isAdmin && (
              <button onClick={() => { setShowMenu(false); openAdminPanel() }}
                className="w-full flex items-center gap-3 px-6 py-4 text-right hover:bg-dark-50 transition-all border-b border-dark-border">
                <span className="text-lg">⚙️</span>
                <span className="text-primary font-bold text-sm">ניהול משתמשים</span>
                <span className="mr-auto text-gray-600">›</span>
              </button>
            )}
            <button onClick={() => setMenuPage('account')}
              className="w-full flex items-center gap-3 px-6 py-4 text-right hover:bg-dark-50 transition-all border-b border-dark-border/40">
              <span className="text-lg">👤</span>
              <span className="text-white font-bold text-sm">ניהול חשבון</span>
              <span className="mr-auto text-gray-600">›</span>
            </button>
            {[
              { key: 'rules', label: 'חוקים והוראות', icon: '📋' },
              { key: 'privacy', label: 'מדיניות פרטיות', icon: '🔒' },
              { key: 'terms', label: 'תנאי שימוש', icon: '📄' },
              { key: 'contact', label: 'צרו קשר', icon: '✉️' },
            ].map(item => (
              <button key={item.key} onClick={() => setMenuPage(item.key as any)}
                className="w-full flex items-center gap-3 px-6 py-4 text-right hover:bg-dark-50 transition-all border-b border-dark-border/40 last:border-0">
                <span className="text-lg">{item.icon}</span>
                <span className="text-white font-bold text-sm">{item.label}</span>
                <span className="mr-auto text-gray-600">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu sub-pages */}
      {showMenu && menuPage && (
        <div className="fixed inset-0 z-50 bg-dark flex flex-col" dir="rtl">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-dark-border shrink-0">
            <button onClick={() => setMenuPage(null)} className="text-gray-400 text-sm">→ חזרה</button>
            <h2 className="text-white font-black text-base">
              {menuPage === 'rules' ? 'חוקים והוראות' : menuPage === 'privacy' ? 'מדיניות פרטיות' : menuPage === 'terms' ? 'תנאי שימוש' : menuPage === 'account' ? 'ניהול חשבון' : 'צרו קשר'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 text-right">
            {menuPage === 'rules' && (<>
              <p className="text-primary font-black text-base">ניקוד ניחושים</p>
              {[
                { pts: '5 נקודות 🎯', desc: 'תוצאה מדויקת — ניחשת את הסקור המדויק' },
                { pts: '3 נקודות', desc: 'מנצחת נכונה + כמות שערים של קבוצה אחת נכונה' },
                { pts: '2 נקודות', desc: 'ניחשת תיקו — לא חייב מדויק' },
                { pts: 'נקודה אחת', desc: 'ניחשת את המנצחת בלבד' },
                { pts: '0 נקודות', desc: 'המנצחת שגויה' },
              ].map(r => (
                <div key={r.pts} className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                  <p className="text-white font-black text-sm">{r.pts}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{r.desc}</p>
                </div>
              ))}
              <p className="text-primary font-black text-base pt-2">לחצנים מיוחדים</p>
              {[
                { name: 'X2', time: 'בזמן המחצית', desc: 'מכפיל את הניקוד שלך פי 2' },
                { name: 'X3', time: 'לפני המשחק', desc: 'משלש את הניקוד שלך' },
                { name: 'GOALS+', time: 'לפני המשחק', desc: 'כל גול במשחק שווה נקודה נוספת' },
                { name: 'SHINOO', time: 'בזמן המחצית', desc: 'שנה גול אחד בניחוש שלך' },
                { name: 'SPLIT', time: 'לפני המשחק', desc: 'נחש 2 תוצאות, תקבל ניקוד על הטובה' },
                { name: "90'", time: 'עד דקה 90', desc: 'מגריל לך ניחוש חדש אקראי' },
              ].map(p => (
                <div key={p.name} className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-white font-black text-sm">{p.name}</span>
                    <span className="text-gray-500 text-xs">{p.time}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{p.desc}</p>
                </div>
              ))}
              <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                <p className="text-gray-400 text-xs">• לחצן אחד בלבד לכל משחק</p>
                <p className="text-gray-400 text-xs mt-1">• רכישה רק עם מטבעות מהמרקט</p>
              </div>
            </>)}

            {menuPage === 'privacy' && (<>
              <p className="text-white font-black text-base">מדיניות פרטיות</p>
              <p className="text-gray-400 text-sm leading-relaxed">שינו אוספת מינימום מידע הכרחי לפעילות האפליקציה בלבד.</p>
              {[
                { title: 'מה אנחנו אוספים', body: 'שם משתמש שבחרת, ניחושים שמסרת, ופעילות כללית באפליקציה.' },
                { title: 'מה אנחנו לא אוספים', body: 'כתובת מייל, מספר טלפון, פרטי תשלום, או כל מידע אישי מזהה.' },
                { title: 'שיתוף מידע', body: 'המידע לא נמכר ולא מועבר לצדדים שלישיים. ניחושים של משתמשים גלויים לחברי הליגה בלבד.' },
                { title: 'מחיקת חשבון', body: 'ניתן לפנות אלינו בכל עת לבקשת מחיקת החשבון והנתונים.' },
              ].map(s => (
                <div key={s.title} className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                  <p className="text-white font-bold text-sm mb-1">{s.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{s.body}</p>
                </div>
              ))}
            </>)}

            {menuPage === 'terms' && (<>
              <p className="text-white font-black text-base">תנאי שימוש</p>
              <p className="text-gray-400 text-sm leading-relaxed">השימוש באפליקציה מהווה הסכמה לתנאים הבאים.</p>
              {[
                { title: 'האפליקציה לבידור בלבד', body: 'שינו היא אפליקציית ניחושים לבידור. אין כאן הימורים בכסף אמיתי ואין פרסים כספיים.' },
                { title: 'גיל מינימלי', body: 'השימוש באפליקציה מותר מגיל 13 ומעלה.' },
                { title: 'אחריות', body: 'אנו לא אחראים על זמינות שירות רציפה, דיוק תוצאות בזמן אמת, או כל נזק שנגרם כתוצאה משימוש באפליקציה.' },
                { title: 'שינויים', body: 'אנו שומרים את הזכות לשנות את הכללים, הניקוד, ותנאי השימוש בכל עת.' },
              ].map(s => (
                <div key={s.title} className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
                  <p className="text-white font-bold text-sm mb-1">{s.title}</p>
                  <p className="text-gray-400 text-xs leading-relaxed">{s.body}</p>
                </div>
              ))}
              <p className="text-gray-600 text-xs text-center pt-2">© כל הזכויות שמורות לערד ישי</p>
            </>)}

            {menuPage === 'account' && (<>
              <p className="text-white font-black text-base">שינוי שם משתמש</p>
              <div className="flex gap-2">
                <input
                  value={accountUsername}
                  onChange={e => setAccountUsername(e.target.value)}
                  placeholder="שם משתמש חדש"
                  className="flex-1 bg-dark-50 border border-dark-border rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 text-right"
                  dir="rtl"
                />
                <button
                  disabled={accountLoading || !accountUsername.trim()}
                  onClick={async () => {
                    setAccountLoading(true); setAccountMsg(null)
                    const res = await fetch('/api/user/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'username', newUsername: accountUsername }) })
                    const data = await res.json()
                    setAccountMsg(res.ok ? { ok: true, text: 'שם משתמש עודכן!' } : { ok: false, text: data.error })
                    setAccountLoading(false)
                  }}
                  className="bg-primary text-black font-black text-sm px-4 py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >שמור</button>
              </div>

              <p className="text-white font-black text-base pt-2">שינוי סיסמה</p>
              <input
                type="password"
                value={accountCurPass}
                onChange={e => setAccountCurPass(e.target.value)}
                placeholder="סיסמה נוכחית"
                className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 text-right"
                dir="rtl"
              />
              <div className="flex gap-2">
                <input
                  type="password"
                  value={accountNewPass}
                  onChange={e => setAccountNewPass(e.target.value)}
                  placeholder="סיסמה חדשה"
                  className="flex-1 bg-dark-50 border border-dark-border rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 text-right"
                  dir="rtl"
                />
                <button
                  disabled={accountLoading || !accountCurPass || !accountNewPass}
                  onClick={async () => {
                    setAccountLoading(true); setAccountMsg(null)
                    const res = await fetch('/api/user/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', currentPassword: accountCurPass, newPassword: accountNewPass }) })
                    const data = await res.json()
                    setAccountMsg(res.ok ? { ok: true, text: 'סיסמה עודכנה!' } : { ok: false, text: data.error })
                    if (res.ok) { setAccountCurPass(''); setAccountNewPass('') }
                    setAccountLoading(false)
                  }}
                  className="bg-primary text-black font-black text-sm px-4 py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >שמור</button>
              </div>

              {accountMsg && (
                <p className={`text-sm font-bold text-center ${accountMsg.ok ? 'text-primary' : 'text-red-400'}`}>{accountMsg.text}</p>
              )}

              <div className="pt-4 border-t border-dark-border">
                <button
                  onClick={async () => {
                    if (!confirm('למחוק את החשבון לצמיתות? לא ניתן לשחזר.')) return
                    const res = await fetch('/api/user/account', { method: 'DELETE' })
                    if (res.ok) window.location.href = '/login'
                  }}
                  className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 font-black text-sm active:scale-95 transition-all"
                >מחק חשבון לצמיתות</button>
              </div>
            </>)}

            {menuPage === 'contact' && (<>
              <p className="text-white font-black text-base">צרו קשר</p>
              <p className="text-gray-400 text-sm leading-relaxed">לשאלות, בעיות, או הצעות — נשמח לשמוע.</p>
              <a href="mailto:aradishai10@gmail.com"
                className="block bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-center">
                <p className="text-primary font-black text-sm">aradishai10@gmail.com</p>
                <p className="text-gray-500 text-xs mt-1">לחץ לשליחת מייל</p>
              </a>
            </>)}
          </div>
          <div className="px-5 pb-8 pt-3 shrink-0">
            <button onClick={() => { setMenuPage(null); setShowMenu(false) }}
              className="w-full py-3 rounded-2xl bg-dark-card border border-dark-border text-gray-400 font-bold text-sm">
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        {/* Top row: יציאה + share + admin */}
        <div className="flex items-center justify-between">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              router.push('/login')
            }}
            className="text-sm font-medium text-gray-300 bg-dark-card border border-dark-border px-3 py-1.5 rounded-xl hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            יציאה
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={shareApp}
              className="w-9 h-9 flex items-center justify-center bg-dark-card border border-dark-border rounded-xl text-gray-300 hover:text-white transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={() => setShowMenu(true)}
              className="w-9 h-9 flex items-center justify-center bg-dark-card border border-dark-border rounded-xl text-gray-300 hover:text-white transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Logo centered */}
        <div className="flex justify-center -mt-1">
          <img src="/shinoo-logo.png" alt="SHINOO" className="h-48 w-auto" style={{ mixBlendMode: 'lighten' }} fetchPriority="high" />
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
                <button
                  key={league.id}
                  onClick={() => fetchPrimaryLeague(league.id)}
                  className={`flex-shrink-0 text-xs rounded-xl px-3 py-2 transition-all whitespace-nowrap ${
                    primaryLeague?.id === league.id
                      ? 'bg-primary text-black font-black'
                      : 'bg-dark-card border border-dark-border text-gray-400 hover:border-primary/40 hover:text-white'
                  }`}
                >
                  {league.name}
                </button>
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
                      x3Applied: !!match.userPrediction.x3Applied,
                      goalsApplied: !!match.userPrediction.goalsApplied,
                      minute90Applied: !!match.userPrediction.minute90Applied,
                      splitApplied: !!match.userPrediction.splitApplied,
                      x2Stock: user?.x2Stock ?? 0,
                      shinooStock: user?.shinooStock ?? 0,
                      x3Stock: user?.x3Stock ?? 0,
                      goalsStock: user?.goalsStock ?? 0,
                      minute90Stock: user?.minute90Stock ?? 0,
                      splitStock: user?.splitStock ?? 0,
                      usage: match.powerupUsage || null,
                      onX2: () => applyX2(match),
                      onShinoo: () => setShinooModal(match),
                      onX3: () => applyX3(match),
                      onGoals: () => applyGoals(match),
                      onMinute90: () => applyMinute90(match),
                      onSplit: () => { setSplitModal(match); setSplitScores({ home: '0', away: '0' }) },
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
                      x3Applied: !!match.userPrediction.x3Applied,
                      goalsApplied: !!match.userPrediction.goalsApplied,
                      minute90Applied: !!match.userPrediction.minute90Applied,
                      splitApplied: !!match.userPrediction.splitApplied,
                      x2Stock: user?.x2Stock ?? 0,
                      shinooStock: user?.shinooStock ?? 0,
                      x3Stock: user?.x3Stock ?? 0,
                      goalsStock: user?.goalsStock ?? 0,
                      minute90Stock: user?.minute90Stock ?? 0,
                      splitStock: user?.splitStock ?? 0,
                      usage: match.powerupUsage || null,
                      onX2: () => applyX2(match),
                      onShinoo: () => setShinooModal(match),
                      onX3: () => applyX3(match),
                      onGoals: () => applyGoals(match),
                      onMinute90: () => applyMinute90(match),
                      onSplit: () => { setSplitModal(match); setSplitScores({ home: '0', away: '0' }) },
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
