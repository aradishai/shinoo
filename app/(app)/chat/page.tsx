'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  id: string
  content: string
  createdAt: string
  user: { id: string; username: string }
}

interface LeagueChat {
  id: string
  name: string
  lastMessage?: { content: string; user: { username: string }; createdAt: string } | null
}

interface Member {
  userId: string
  username: string
}

export default function ChatPage() {
  const [leagues, setLeagues] = useState<LeagueChat[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load leagues + current user once
  useEffect(() => {
    fetch('/api/chat/leagues')
      .then(r => r.json())
      .then(d => {
        const list: LeagueChat[] = d.leagues ?? []
        setLeagues(list)
        setLoadingLeagues(false)
        if (list.length === 1) setSelectedLeagueId(list[0].id)
        const uid = d.currentUserId ?? null
        setCurrentUserId(uid)
      })
      .catch(() => setLoadingLeagues(false))
  }, [])

  // Load members when league selected
  useEffect(() => {
    if (!selectedLeagueId) return
    fetch(`/api/leagues/${selectedLeagueId}/members`)
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {})
  }, [selectedLeagueId])

  const fetchMessages = useCallback(() => {
    if (!selectedLeagueId) return
    fetch(`/api/leagues/${selectedLeagueId}/chat`)
      .then(r => r.json())
      .then(d => {
        setMessages(prev => {
          const incoming: Message[] = d.messages ?? []
          if (incoming.length === prev.length && incoming[incoming.length - 1]?.id === prev[prev.length - 1]?.id) return prev
          return incoming
        })
      })
      .catch(() => {})
  }, [selectedLeagueId])

  // Poll every 5s
  useEffect(() => {
    if (!selectedLeagueId) return
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [selectedLeagueId, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx !== -1) {
      const query = val.slice(atIdx + 1)
      if (query.length >= 0 && !query.includes(' ')) {
        setMentionQuery(query)
        return
      }
    }
    setMentionQuery(null)
  }

  const mentionSuggestions = mentionQuery !== null
    ? members.filter(m => m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) && m.userId !== currentUserId)
    : []

  const insertMention = (username: string) => {
    const atIdx = input.lastIndexOf('@')
    setInput(input.slice(0, atIdx) + '@' + username + ' ')
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedLeagueId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/leagues/${selectedLeagueId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (res.ok) {
        setInput('')
        setMentionQuery(null)
        await fetchMessages()
      }
    } finally {
      setSending(false)
    }
  }

  if (loadingLeagues) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">טוען...</p>
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="text-5xl mb-4">💬</div>
        <p className="text-gray-500">אין לך ליגות עדיין</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-6 pb-3 flex-shrink-0">
        <h1 className="text-white font-black text-2xl mb-3">צ&apos;אט</h1>

        {/* League selector (only shown if multiple leagues) */}
        {leagues.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {leagues.map(l => (
              <button
                key={l.id}
                onClick={() => { setSelectedLeagueId(l.id); setMessages([]) }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  selectedLeagueId === l.id
                    ? 'bg-primary text-black'
                    : 'bg-dark-card border border-dark-border text-gray-400'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}

        {leagues.length === 1 && (
          <p className="text-gray-400 text-sm">{leagues[0].name}</p>
        )}
      </div>

      {/* Messages */}
      {!selectedLeagueId ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">בחר ליגה כדי לפתוח את הצ&apos;אט</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-2">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-3">💬</div>
                  <p>אין הודעות עדיין - היה הראשון!</p>
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.user.id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-start' : 'items-end'}`}>
                    {!isMe && (
                      <span className="text-xs text-gray-500 px-1">{msg.user.username}</span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-primary text-black font-medium rounded-tr-sm'
                        : 'bg-dark-card border border-dark-border text-white rounded-tl-sm'
                    }`}>
                      {msg.content.split(/(@\w+)/g).map((part, i) =>
                        part.startsWith('@')
                          ? <span key={i} className={`font-bold ${isMe ? 'text-black/70' : 'text-primary'}`}>{part}</span>
                          : part
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* @mention suggestions */}
          {mentionSuggestions.length > 0 && (
            <div className="flex gap-2 px-4 pb-2 flex-wrap flex-shrink-0">
              {mentionSuggestions.map(m => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => insertMention(m.username)}
                  className="bg-dark-card border border-primary/40 text-primary text-sm px-3 py-1 rounded-full active:scale-95 transition-all"
                >
                  @{m.username}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 px-4 pb-4 pt-2 border-t border-dark-border flex-shrink-0">
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-primary text-black font-black px-4 py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
            >
              {sending ? '...' : 'שלח'}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInput}
              placeholder="כתוב הודעה... (@ לתיוג)"
              maxLength={300}
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none text-right"
            />
          </form>
        </>
      )}
    </div>
  )
}
