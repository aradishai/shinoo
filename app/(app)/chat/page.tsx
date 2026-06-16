'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { registerPush } from '@/components/push-register'

const USER_COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff9f43','#a29bfe','#fd79a8','#00cec9','#e17055','#55efc4','#74b9ff','#fdcb6e']

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) { hash = userId.charCodeAt(i) + ((hash << 5) - hash); hash |= 0 }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

interface Message {
  id: string
  content: string
  createdAt: string
  isSystem: boolean
  user: { id: string; username: string; avatar: string }
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
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied' | 'loading' | 'ios-browser' | 'error'>('unknown')
  const [notifError, setNotifError] = useState<string | null>(null)
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pressedMsgId, setPressedMsgId] = useState<string | null>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const NORMAL = 'calc(98px + env(safe-area-inset-bottom, 16px))'
    const el = containerRef.current
    const update = () => {
      const keyboardH = window.innerHeight - vv.offsetTop - vv.height
      const open = keyboardH > 80
      if (el) el.style.bottom = open ? '0px' : NORMAL
      document.body.classList.toggle('chat-keyboard-open', open)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      if (el) el.style.bottom = NORMAL
      document.body.classList.remove('chat-keyboard-open')
    }
  }, [])

  useEffect(() => {
    // Detect iOS Safari (not installed as PWA) - push not supported
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as {standalone?: boolean}).standalone === true)
    if (isIOS && !isPWA) { setNotifStatus('ios-browser'); return }

    if (typeof Notification === 'undefined') return
    const perm = Notification.permission
    if (perm === 'denied') { setNotifStatus('denied'); return }
    if (perm === 'granted') {
      setNotifStatus('granted')
    }
  }, [])

  const enableNotifications = async () => {
    setNotifStatus('loading')
    setNotifError(null)
    const result = await registerPush()
    if (result.ok) {
      setNotifStatus('granted')
    } else {
      setNotifError(result.error ?? null)
      const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unknown'
      setNotifStatus(perm === 'denied' ? 'denied' : 'error')
    }
  }

  useEffect(() => {
    fetch('/api/chat/leagues')
      .then(r => r.json())
      .then(d => {
        const list: LeagueChat[] = d.leagues ?? []
        setLeagues(list)
        setLoadingLeagues(false)
        if (list.length === 1) setSelectedLeagueId(list[0].id)
        setCurrentUserId(d.currentUserId ?? null)
        setIsAdmin(d.isAdmin ?? false)
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
        const incoming: Message[] = d.messages ?? []
        if (incoming.length > 0) {
          localStorage.setItem(`shinoo_chat_read_${selectedLeagueId}`, incoming[incoming.length - 1].createdAt)
        }
        setMessages(prev => {
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

  const handlePressStart = (msgId: string) => {
    if (!isAdmin) return
    pressTimerRef.current = setTimeout(() => setPressedMsgId(msgId), 500)
  }
  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
  }

  const deleteMessage = async (msgId: string) => {
    if (!selectedLeagueId) return
    setPressedMsgId(null)
    await fetch(`/api/leagues/${selectedLeagueId}/chat/${msgId}`, { method: 'DELETE' })
    fetchMessages()
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
    <div
      ref={containerRef}
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden"
      style={{ bottom: 'calc(98px + env(safe-area-inset-bottom, 16px))' }}
      dir="rtl"
    >

      {/* WhatsApp-style header */}
      <div className="flex-shrink-0 bg-[#1f2c34] px-4 pb-3" style={{ paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
        <div className="flex items-center justify-between mb-2 relative">
          {leagues.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto flex-1">
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
            <h1 className="text-white font-bold text-lg flex-1">{leagues[0]?.name}</h1>
          )}

          <div className="flex items-center gap-2 flex-shrink-0 mr-2">
            {/* Avatar picker button */}
            {notifStatus === 'ios-browser' && (
              <span className="text-[10px] text-gray-400 text-right leading-tight max-w-[90px]">הוסף למסך הבית לקבלת התראות</span>
            )}
            {notifStatus === 'denied' && (
              <span className="text-xs text-gray-500">🔕</span>
            )}
            {(notifStatus === 'unknown' || notifStatus === 'granted' || notifStatus === 'loading' || notifStatus === 'error') && (
              <button
                onClick={enableNotifications}
                disabled={notifStatus === 'loading'}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 ${
                  notifStatus === 'granted' ? 'bg-[#2a3942] text-[#00a884]' : 'bg-[#00a884] text-white'
                }`}
              >
                {notifStatus === 'loading' ? '...' : notifStatus === 'granted' ? '🔔' : '🔔 הפעל'}
              </button>
            )}
          </div>
          {notifError && (
            <span className="absolute top-full right-0 mt-1 text-[10px] text-red-400 bg-[#0b141a] px-2 py-1 rounded max-w-[200px] text-right z-10">
              {notifError}
            </span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-1"
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
          if (msg.isSystem) {
            const multiLine = msg.content.includes('\n')
            return (
              <div key={msg.id} className="flex justify-center my-1 relative"
                onTouchStart={() => handlePressStart(msg.id)}
                onTouchEnd={handlePressEnd}
                onTouchMove={handlePressEnd}
                onContextMenu={e => { if (isAdmin) { e.preventDefault(); setPressedMsgId(msg.id) } }}
              >
                <div className={`bg-[#1a2e35] border border-[#d4a847]/30 text-[#d4a847] text-xs px-4 py-1.5 max-w-[90%] whitespace-pre-line ${multiLine ? 'rounded-2xl text-right' : 'rounded-full text-center'}`}>
                  {msg.content}
                </div>
                {pressedMsgId === msg.id && (
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 rounded-2xl z-10">
                    <button onClick={() => deleteMessage(msg.id)} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95">מחק</button>
                    <button onClick={() => setPressedMsgId(null)} className="bg-[#2a3942] text-gray-300 text-xs px-3 py-1.5 rounded-xl active:scale-95">ביטול</button>
                  </div>
                )}
              </div>
            )
          }

          const isMe = msg.user.id === currentUserId
          const prevMsg = messages[i - 1]
          const showName = !isMe && (i === 0 || prevMsg?.isSystem || prevMsg?.user.id !== msg.user.id)
          const userColor = getUserColor(msg.user.id)

          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-start' : 'justify-end'} relative`}
              onTouchStart={() => handlePressStart(msg.id)}
              onTouchEnd={handlePressEnd}
              onTouchMove={handlePressEnd}
              onContextMenu={e => { if (isAdmin) { e.preventDefault(); setPressedMsgId(msg.id) } }}
            >
              {pressedMsgId === msg.id && (
                <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 rounded-2xl z-10">
                  <button onClick={() => deleteMessage(msg.id)} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95">מחק</button>
                  <button onClick={() => setPressedMsgId(null)} className="bg-[#2a3942] text-gray-300 text-xs px-3 py-1.5 rounded-xl active:scale-95">ביטול</button>
                </div>
              )}
              <div className={`max-w-[78%] min-w-0 ${isMe ? 'items-start' : 'items-end'} flex flex-col`}>
                <div className={`relative px-3 pt-1.5 pb-5 rounded-2xl text-sm leading-relaxed min-w-[80px] ${
                  isMe
                    ? 'bg-[#1f2c34] text-white rounded-tr-sm'
                    : 'bg-[#005c4b] text-white rounded-tl-sm'
                }`}>
                  {showName && (
                    <span className="block text-xs font-semibold mb-0.5" style={{ color: userColor }}>
                      {msg.user.username}
                    </span>
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
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34] flex-shrink-0 overflow-hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}>
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
          style={{ fontSize: '16px' }}
          className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 text-white focus:outline-none text-right min-w-0"
        />
      </form>
    </div>
  )
}
