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

  useEffect(() => {
    fetch('/api/chat/leagues')
      .then(r => r.json())
      .then(d => {
        const list: LeagueChat[] = d.leagues ?? []
        setLeagues(list)
        setLoadingLeagues(false)
        if (list.length === 1) setSelectedLeagueId(list[0].id)
        setCurrentUserId(d.currentUserId ?? null)
      })
      .catch(() => setLoadingLeagues(false))
  }, [])

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

  useEffect(() => {
    if (!selectedLeagueId) return
    fetchMessages()
    pollRef.current = setInterval(fetchMessages, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selectedLeagueId, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx !== -1) {
      const query = val.slice(atIdx + 1)
      if (!query.includes(' ')) { setMentionQuery(query); return }
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
      if (res.ok) { setInput(''); setMentionQuery(null); await fetchMessages() }
    } finally { setSending(false) }
  }

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId)

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

      {/* WhatsApp-style header */}
      <div className="flex-shrink-0 bg-[#1f2c34] px-4 pt-5 pb-3">
        {leagues.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto">
            {leagues.map(l => (
              <button
                key={l.id}
                onClick={() => { setSelectedLeagueId(l.id); setMessages([]) }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
                  selectedLeagueId === l.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-gray-400'
                }`}
              >
                {l.name}
              </button>
            ))}
          </div>
        ) : (
          <h1 className="text-white font-bold text-lg">{leagues[0]?.name}</h1>
        )}
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff08 1px, transparent 0)', backgroundSize: '24px 24px', backgroundColor: '#0b141a' }}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-[#1f2c34] rounded-xl px-4 py-2 text-gray-400 text-sm">
              אין הודעות עדיין
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user.id === currentUserId
          const prevMsg = messages[i - 1]
          const showName = !isMe && prevMsg?.user.id !== msg.user.id

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[78%] ${isMe ? 'items-start' : 'items-end'} flex flex-col`}>
                <div className={`relative px-3 pt-1.5 pb-5 rounded-2xl text-sm leading-relaxed min-w-[80px] ${
                  isMe
                    ? 'bg-[#1f2c34] text-white rounded-tr-sm'
                    : 'bg-[#005c4b] text-white rounded-tl-sm'
                }`}>
                  {showName && (
                    <span className="block text-xs font-semibold text-[#00a884] mb-0.5">{msg.user.username}</span>
                  )}
                  <span>
                    {msg.content.split(/(@\w+)/g).map((part, j) =>
                      part.startsWith('@')
                        ? <span key={j} className="font-bold text-[#53bdeb]">{part}</span>
                        : part
                    )}
                  </span>
                  <span className="absolute bottom-1 left-2 text-[10px] text-white/40">
                    {new Date(msg.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* @mention suggestions */}
      {mentionSuggestions.length > 0 && (
        <div className="flex gap-2 px-3 py-2 bg-[#1f2c34] flex-wrap flex-shrink-0">
          {mentionSuggestions.map(m => (
            <button
              key={m.userId}
              type="button"
              onClick={() => insertMention(m.username)}
              className="bg-[#2a3942] text-[#00a884] text-sm px-3 py-1 rounded-full active:scale-95 transition-all"
            >
              @{m.username}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp-style input bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34] flex-shrink-0">
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          maxLength={300}
          className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 text-white text-sm focus:outline-none text-right"
        />
      </form>
    </div>
  )
}
