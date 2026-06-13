'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { LeagueTable } from '@/components/league-table'
import { MatchCard } from '@/components/match-card'

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
  userPrediction?: { predictedHomeScore: number; predictedAwayScore: number } | null
}

interface LeagueDetail {
  id: string
  name: string
  inviteCode: string
  createdAt: string
  createdBy: { id: string; username: string }
  standings: StandingEntry[]
  rounds: string[]
  matches: Match[]
}

export default function LeagueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const leagueId = params.id as string

  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addMemberUsername, setAddMemberUsername] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'members' | 'chat'>(
    searchParams.get('tab') === 'chat' ? 'chat' : 'standings'
  )
  const [copiedCode, setCopiedCode] = useState(false)
  const [messages, setMessages] = useState<{ id: string; content: string; createdAt: string; user: { id: string; username: string } }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<string | null>(null)
  const [allRounds, setAllRounds] = useState<string[]>([])
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chatPollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async (round?: string | null) => {
    try {
      const effectiveRound = round !== undefined ? round : selectedRound
      const leagueUrl = effectiveRound
        ? `/api/leagues/${leagueId}?round=${encodeURIComponent(effectiveRound)}`
        : `/api/leagues/${leagueId}`

      const [leagueRes, meRes] = await Promise.all([
        fetch(leagueUrl),
        fetch('/api/auth/me'),
      ])

      if (!leagueRes.ok) {
        if (leagueRes.status === 403) {
          toast.error('אינך חבר בליגה זו')
          router.push('/leagues')
        }
        return
      }

      const [leagueData, meData] = await Promise.all([
        leagueRes.json(),
        meRes.json(),
      ])

      setLeague(leagueData.data)
      if (leagueData.data?.rounds?.length) setAllRounds(leagueData.data.rounds)
      setCurrentUserId(meData.data?.id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [leagueId, router, selectedRound])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/sync/live')
        const data = await res.json()
        if (data.synced) fetchData()
      } catch { /* silent */ }
    }
    syncIntervalRef.current = setInterval(poll, 10_000)
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current) }
  }, [fetchData])

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/chat`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
    } catch { /* silent */ }
  }, [leagueId])

  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChat()
      chatPollRef.current = setInterval(fetchChat, 5000)
      setTimeout(() => chatBottomRef.current?.scrollIntoView(), 100)
    } else {
      if (chatPollRef.current) clearInterval(chatPollRef.current)
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current) }
  }, [activeTab, fetchChat])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleChatInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setChatInput(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setMentionQuery('')
    } else if (atIdx !== -1 && val.slice(atIdx + 1).match(/^\w+$/)) {
      setMentionQuery(val.slice(atIdx + 1).toLowerCase())
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (username: string) => {
    const atIdx = chatInput.lastIndexOf('@')
    const newVal = chatInput.slice(0, atIdx) + `@${username} `
    setChatInput(newVal)
    setMentionQuery(null)
    chatInputRef.current?.focus()
  }

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || sendingChat) return
    setSendingChat(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput.trim() }),
      })
      if (res.ok) {
        setChatInput('')
        setMentionQuery(null)
        fetchChat()
      }
    } finally {
      setSendingChat(false)
    }
  }

  const mentionSuggestions = mentionQuery !== null && league
    ? league.standings
        .filter(m => m.userId !== currentUserId && m.username.toLowerCase().includes(mentionQuery))
        .slice(0, 4)
    : []

  const handleRoundSelect = (round: string | null) => {
    setSelectedRound(round)
    fetchData(round)
  }

  const copyInviteCode = () => {
    if (!league) return
    navigator.clipboard.writeText(league.inviteCode)
    setCopiedCode(true)
    toast.success('הקוד הועתק!')
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const shareOnWhatsApp = () => {
    if (!league) return
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const message = `הצטרף לליגת "${league.name}" ב-SHINOO!\n\nקוד הזמנה: ${league.inviteCode}\n\n${appUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addMemberUsername.trim()) return

    setAddingMember(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addMemberUsername.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'שגיאה בהוספת חבר')
        return
      }

      toast.success(data.message || 'חבר נוסף!')
      setAddMemberUsername('')
      fetchData()
    } catch {
      toast.error('שגיאת חיבור')
    } finally {
      setAddingMember(false)
    }
  }

  const isAdmin = league?.standings.find(
    (s) => s.userId === currentUserId && s.role === 'ADMIN'
  )

  const handleRename = async () => {
    if (!newName.trim() || !league) return
    const res = await fetch(`/api/leagues/${leagueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      toast.success('שם הליגה עודכן')
      setEditingName(false)
      fetchData()
    } else {
      toast.error('שגיאה בשינוי שם')
    }
  }

  const handleDeleteLeague = async () => {
    if (!confirm(`למחוק את הליגה "${league?.name}" לצמיתות? כל הניחושים יימחקו.`)) return
    const res = await fetch(`/api/leagues/${leagueId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('הליגה נמחקה')
      router.push('/')
    } else {
      const d = await res.json()
      toast.error(d.error || 'שגיאה במחיקה')
    }
  }

  const handleRemoveMember = async (memberId: string, username: string) => {
    if (!confirm(`להסיר את ${username} מהליגה?`)) return
    setRemovingMember(memberId)
    const res = await fetch(`/api/leagues/${leagueId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    setRemovingMember(null)
    if (res.ok) {
      toast.success(`${username} הוסר מהליגה`)
      fetchData()
    } else {
      const d = await res.json()
      toast.error(d.error || 'שגיאה')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">טוען...</p>
        </div>
      </div>
    )
  }

  if (!league) return null

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/leagues" className="text-gray-400 hover:text-white transition-colors">
          ← חזרה
        </Link>
        {isAdmin && editingName ? (
          <div className="flex items-center gap-2 flex-1 mx-2">
            <button onClick={handleRename} className="text-primary font-bold text-sm">שמור</button>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRename()}
              className="flex-1 bg-dark-card border border-primary rounded-xl px-3 py-1.5 text-white text-center text-sm focus:outline-none"
            />
            <button onClick={() => setEditingName(false)} className="text-gray-500 text-sm">ביטול</button>
          </div>
        ) : (
          <h1
            className={`text-white font-black text-xl text-center flex-1 mx-2 truncate ${isAdmin ? 'cursor-pointer' : ''}`}
            onClick={() => { if (isAdmin) { setNewName(league.name); setEditingName(true) } }}
          >
            {league.name}
            {isAdmin && <span className="text-gray-600 text-xs mr-1">✎</span>}
          </h1>
        )}
        <button
          onClick={shareOnWhatsApp}
          className="bg-green-600/20 text-green-400 border border-green-600/30 px-3 py-1.5 rounded-xl text-sm font-medium"
        >
          שתף
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-dark-card border border-dark-border rounded-xl p-1 mb-6">
        {[
          { id: 'standings', label: 'טבלה' },
          { id: 'matches', label: 'משחקים' },
          { id: 'chat', label: 'צ\'אט' },
          { id: 'members', label: 'חברים' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-black'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Standings Tab */}
      {activeTab === 'standings' && (
        <div>
          {/* Round filter */}
          {allRounds.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              <button
                onClick={() => handleRoundSelect(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedRound === null
                    ? 'bg-primary text-black'
                    : 'bg-dark-card border border-dark-border text-gray-400'
                }`}
              >
                הכל
              </button>
              {allRounds.map(round => (
                <button
                  key={round}
                  onClick={() => handleRoundSelect(round)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedRound === round
                      ? 'bg-primary text-black'
                      : 'bg-dark-card border border-dark-border text-gray-400'
                  }`}
                >
                  {round}
                </button>
              ))}
            </div>
          )}

          <LeagueTable standings={league.standings} currentUserId={currentUserId || undefined} />

          {/* History link */}
          <Link
            href={`/leagues/${leagueId}/history`}
            className="mt-4 flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-gray-300 transition-colors py-2"
          >
            📋 היסטוריית הניחושים שלי
          </Link>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {league.matches.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-4xl mb-3">📅</div>
              <p>אין משחקים מתוכננים</p>
            </div>
          ) : (
            league.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={match.userPrediction}
                leagueId={leagueId}
              />
            ))
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[calc(100vh-280px)]">
          <div className="flex-1 overflow-y-auto space-y-2 pb-2">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <div className="text-4xl mb-3">💬</div>
                <p>אין הודעות עדיין - היה הראשון!</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.user.id === currentUserId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] ${isMe ? 'items-start' : 'items-end'} flex flex-col gap-0.5`}>
                    {!isMe && (
                      <span className="text-xs text-gray-500 px-1">{msg.user.username}</span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
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
                  </div>
                </div>
              )
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* @mention suggestions */}
          {mentionSuggestions.length > 0 && (
            <div className="flex gap-2 pb-2 flex-wrap">
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

          <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-dark-border">
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="bg-primary text-black font-black px-4 py-3 rounded-xl disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
            >
              {sendingChat ? '...' : 'שלח'}
            </button>
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={handleChatInput}
              placeholder="כתוב הודעה... (@ לתיוג)"
              maxLength={300}
              className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none text-right"
            />
          </form>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div className="space-y-2 mb-6">
            {league.standings.map((member) => (
              <div
                key={member.userId}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  member.userId === currentUserId
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-dark-card border-dark-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAdmin && member.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(member.userId, member.username)}
                      disabled={removingMember === member.userId}
                      className="text-red-500 text-xs border border-red-500/30 bg-red-500/10 px-2 py-1 rounded-lg active:scale-95 transition-all"
                    >
                      {removingMember === member.userId ? '...' : 'הסר'}
                    </button>
                  )}
                  <span className="text-primary font-bold">{member.totalPoints} נק'</span>
                  {member.role === 'ADMIN' && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                      מנהל
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-bold ${member.userId === currentUserId ? 'text-primary' : 'text-white'}`}>
                    {member.username}
                    {member.userId === currentUserId && <span className="text-gray-500 font-normal text-xs mr-1">(אני)</span>}
                  </p>
                  <p className="text-gray-500 text-xs">{member.predictionCount} ניחושים</p>
                </div>
              </div>
            ))}
          </div>


          {/* Add Member (admin only) */}
          {isAdmin && (
            <div>
              <h3 className="text-white font-bold mb-3 text-right">הוסף חבר</h3>
              <form onSubmit={handleAddMember} className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingMember || !addMemberUsername.trim()}
                  className="bg-primary text-black font-bold px-4 py-3 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50"
                >
                  {addingMember ? '...' : 'הוסף'}
                </button>
                <input
                  type="text"
                  value={addMemberUsername}
                  onChange={(e) => setAddMemberUsername(e.target.value)}
                  placeholder="שם משתמש"
                  className="flex-1 bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none text-right"
                />
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete League (admin only) */}
      {isAdmin && (
        <div className="mt-6">
          <button
            onClick={handleDeleteLeague}
            className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 font-black text-sm active:scale-95 transition-all"
          >
            מחק ליגה לצמיתות
          </button>
        </div>
      )}

      {/* Invite Code */}
      <div className="mt-4 flex items-center justify-between py-3 px-4 bg-dark-card border border-dark-border rounded-xl">
        <button onClick={copyInviteCode} className="text-primary text-xs font-medium">
          {copiedCode ? 'הועתק! ✓' : 'העתק'}
        </button>
        <div className="text-right">
          <p className="text-gray-600 text-xs">קוד הזמנה</p>
          <p className="text-gray-400 font-mono text-sm tracking-widest">{league.inviteCode}</p>
        </div>
      </div>
    </div>
  )
}
