'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { MatchCard } from '@/components/match-card'
import { LeagueCard } from '@/components/league-card'

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

interface League {
  id: string
  name: string
  inviteCode: string
  memberCount: number
  userRank: number
  userPoints: number
  role?: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [joiningLeague, setJoiningLeague] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [meRes, matchesRes, leaguesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/matches?status=SCHEDULED'),
        fetch('/api/leagues'),
      ])

      if (!meRes.ok) {
        router.push('/login')
        return
      }

      const [meData, matchesData, leaguesData] = await Promise.all([
        meRes.json(),
        matchesRes.json(),
        leaguesRes.json(),
      ])

      setUser(meData.data)
      setMatches((matchesData.data || []).slice(0, 6))
      setLeagues(leaguesData.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      <header className="flex items-center justify-between mb-8">
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
          <h1 className="text-3xl font-black tracking-tight">
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

      {/* World Cup Banner */}
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

      {/* Upcoming Matches */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/matches" className="text-primary text-sm font-medium">
            הכל ←
          </Link>
          <h2 className="text-white font-bold text-lg">משחקים קרובים</h2>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <div className="text-4xl mb-3">📅</div>
            <p>אין משחקים מתוכננים כרגע</p>
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
      </section>

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

      {/* Create League CTA */}
      <section className="mb-8">
        <Link
          href="/leagues/create"
          className="block bg-dark-card border border-dark-border hover:border-primary/30 rounded-2xl p-5 text-center transition-all group"
        >
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="text-white font-bold mb-1 group-hover:text-primary transition-colors">
            צור ליגה חדשה
          </h3>
          <p className="text-gray-500 text-sm">הזמן חברים ותתחרו ביניכם</p>
        </Link>
      </section>

      {/* My Leagues Quick View */}
      {leagues.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <Link href="/leagues" className="text-primary text-sm font-medium">
              הכל ←
            </Link>
            <h2 className="text-white font-bold text-lg">הליגות שלי</h2>
          </div>
          <div className="space-y-3">
            {leagues.slice(0, 3).map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
