'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LeagueChat {
  id: string
  name: string
  lastMessage?: { content: string; user: { username: string }; createdAt: string } | null
}

export default function ChatListPage() {
  const router = useRouter()
  const [leagues, setLeagues] = useState<LeagueChat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/chat/leagues')
      .then(r => r.json())
      .then(d => { setLeagues(d.leagues ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">טוען...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-white font-black text-2xl text-right mb-6">צ'אטים</h1>

      {leagues.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">💬</div>
          <p>אין לך ליגות עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => router.push(`/leagues/${league.id}?tab=chat`)}
              className="w-full bg-dark-card border border-dark-border rounded-2xl p-4 text-right active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-xs">
                  {league.lastMessage
                    ? new Date(league.lastMessage.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
                <h2 className="text-white font-bold">{league.name}</h2>
              </div>
              {league.lastMessage ? (
                <p className="text-gray-400 text-sm mt-1 text-right truncate">
                  <span className="text-gray-500">{league.lastMessage.user.username}: </span>
                  {league.lastMessage.content}
                </p>
              ) : (
                <p className="text-gray-600 text-sm mt-1">אין הודעות עדיין</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
