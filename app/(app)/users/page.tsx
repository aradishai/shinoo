'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface User {
  id: string
  username: string
  createdAt: string
  _count: { leagueMembers: number; predictions: number }
}

interface League {
  id: string
  name: string
  role: string
}

// Simple debounce without external dep
function useSimpleDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export default function UsersPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(false)
  const [inviteModal, setInviteModal] = useState<{ userId: string; username: string } | null>(null)
  const [inviting, setInviting] = useState(false)

  const debouncedQuery = useSimpleDebounce(query, 350)

  useEffect(() => {
    fetch('/api/leagues')
      .then((r) => r.json())
      .then((data) =>
        setLeagues(
          (data.data || [])
            .filter((l: { role?: string }) => l.role === 'ADMIN')
            .map((l: League) => ({ id: l.id, name: l.name, role: l.role }))
        )
      )
  }, [])

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setUsers([])
      return
    }

    setLoading(true)
    fetch(`/api/users?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const handleInvite = async (leagueId: string) => {
    if (!inviteModal) return

    setInviting(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: inviteModal.username }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהזמנה')
        return
      }

      toast.success(data.message || 'הוזמן בהצלחה!')
      setInviteModal(null)
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <h1 className="text-white font-black text-2xl mb-6 text-right">חיפוש שחקנים</h1>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש לפי שם משתמש..."
          autoFocus
          className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:border-primary focus:outline-none transition-colors text-right pe-12"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
          🔍
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && debouncedQuery.length > 0 && users.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>לא נמצאו משתמשים עבור &ldquo;{debouncedQuery}&rdquo;</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {leagues.length > 0 && (
                  <button
                    onClick={() => setInviteModal({ userId: user.id, username: user.username })}
                    className="bg-primary/20 border border-primary/30 text-primary text-sm font-medium px-3 py-1.5 rounded-xl hover:bg-primary/30 transition-colors"
                  >
                    הזמן
                  </button>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{user.username}</p>
                <div className="flex items-center justify-end gap-3 mt-0.5">
                  <span className="text-gray-500 text-xs">{user._count.predictions} ניחושים</span>
                  <span className="text-gray-500 text-xs">{user._count.leagueMembers} ליגות</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!debouncedQuery && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚽</div>
          <p className="text-gray-500 text-lg">חפש חברים לליגה</p>
          <p className="text-gray-600 text-sm mt-2">הקלד לפחות תו אחד לחיפוש</p>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-dark-card border-t border-dark-border w-full rounded-t-3xl p-6 animate-slide-up">
            <h3 className="text-white font-bold text-lg mb-2 text-center">
              הזמן את {inviteModal.username}
            </h3>
            <p className="text-gray-500 text-sm text-center mb-6">בחר ליגה להזמנה</p>

            <div className="space-y-2 mb-6">
              {leagues.length === 0 ? (
                <p className="text-gray-500 text-center py-4">אין ליגות שאתה מנהל</p>
              ) : (
                leagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => handleInvite(league.id)}
                    disabled={inviting}
                    className="w-full bg-dark-50 border border-dark-border hover:border-primary/30 text-white py-3 px-4 rounded-xl text-right font-medium transition-all disabled:opacity-50"
                  >
                    {league.name}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setInviteModal(null)}
              className="w-full text-gray-400 py-3 text-center"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
