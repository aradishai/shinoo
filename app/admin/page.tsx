'use client'
import { useState, useEffect } from 'react'

type Match = {
  id: string
  homeTeam: { nameHe: string }
  awayTeam: { nameHe: string }
  homeScore: number | null
  awayScore: number | null
  status: string
  kickoffAt: string
  round: string | null
}

type Tournament = {
  id: string
  nameHe: string
  slug: string
  isActive: boolean
}

export default function AdminPage() {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string; status: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [togglingTournament, setTogglingTournament] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data?.data?.username === 'ערד') {
          setAllowed(true)
        }
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!allowed) return
    fetch(`/api/admin/tournaments?secret=shinoo-admin-2026`)
      .then(r => r.json())
      .then(({ data }) => setTournaments(data ?? []))

    fetch('/api/admin/matches')
      .then(r => r.json())
      .then(({ data }) => {
        const recent = (data as Match[])
          .filter(m => new Date(m.kickoffAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
          .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
        setMatches(recent)
        const init: typeof scores = {}
        for (const m of recent) {
          init[m.id] = {
            home: m.homeScore?.toString() ?? '',
            away: m.awayScore?.toString() ?? '',
            status: m.status,
          }
        }
        setScores(init)
      })
  }, [allowed])

  const sendMinute90Notification = async (matchId: string, matchLabel: string) => {
    // 1. Reset match to LIVE so minute90 button appears
    const resetRes = await fetch(`/api/admin/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: scores[matchId]?.home ? parseInt(scores[matchId].home) : null, awayScore: scores[matchId]?.away ? parseInt(scores[matchId].away) : null, status: 'LIVE' }),
    })
    if (!resetRes.ok) { setMessage('שגיאה בעדכון סטטוס'); return }

    // 2. Send push to OzyB
    const pushRes = await fetch('/api/admin/push-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: 'shinoo-admin-2026',
        username: 'OzyB',
        title: "⚽ יש לך לחצן דקה 90' זמין!",
        body: `${matchLabel} — לחץ להגרלת ניחוש חדש`,
        url: '/',
      }),
    })
    const pushData = await pushRes.json()
    setMessage(pushRes.ok ? `✓ נשלח ל-OzyB (${pushData.sent} התקנים), המשחק חזר ל-LIVE` : pushData.error || 'שגיאה בשליחה')
    setTimeout(() => setMessage(''), 8000)
  }

  const toggleTournament = async (slug: string, currentlyActive: boolean) => {
    setTogglingTournament(slug)
    const res = await fetch('/api/admin/set-tournament-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: 'shinoo-admin-2026', slug, isActive: !currentlyActive }),
    })
    if (res.ok) {
      setTournaments(prev => prev.map(t => t.slug === slug ? { ...t, isActive: !currentlyActive } : t))
    }
    setTogglingTournament(null)
  }

  const save = async (id: string) => {
    const s = scores[id]
    if (!s) return
    setSaving(id)
    setMessage('')
    const res = await fetch(`/api/admin/matches/${id}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: parseInt(s.home), awayScore: parseInt(s.away), status: s.status }),
    })
    const data = await res.json()
    setSaving(null)
    setMessage(res.ok ? '✓ נשמר' : data.error || 'שגיאה')
    setTimeout(() => setMessage(''), 3000)
  }

  if (!ready) return <div style={{ minHeight: '100vh', background: '#111' }} />

  if (!allowed) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888', fontSize: 16 }}>אין גישה</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111', padding: '24px 16px', direction: 'rtl' }}>
      <h1 style={{ color: '#fff', marginBottom: 16, fontSize: 20 }}>עריכת תוצאות</h1>
      {message && (
        <div style={{ color: message.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 12 }}>
          {message}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: '#aaa', fontSize: 14, marginBottom: 10 }}>טורנירים</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tournaments.map(t => (
            <div key={t.id} style={{ background: '#1e1e1e', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#fff', fontSize: 15 }}>{t.nameHe}</span>
              <button
                onClick={() => toggleTournament(t.slug, t.isActive)}
                disabled={togglingTournament === t.slug}
                style={{
                  padding: '5px 18px',
                  borderRadius: 20,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  background: t.isActive ? '#22c55e' : '#444',
                  color: '#fff',
                  opacity: togglingTournament === t.slug ? 0.5 : 1,
                  transition: 'background 0.2s',
                }}
              >
                {t.isActive ? 'פעיל' : 'כבוי'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {matches.map(m => {
          const s = scores[m.id]
          if (!s) return null
          const date = new Date(m.kickoffAt).toLocaleDateString('he-IL', { month: 'numeric', day: 'numeric' })
          return (
            <div key={m.id} style={{ background: '#1e1e1e', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: '#888', fontSize: 12, minWidth: 40 }}>{date}</span>
              <span style={{ color: '#fff', fontWeight: 600, flex: 1, minWidth: 80 }}>{m.homeTeam.nameHe}</span>
              <input
                type="number"
                min={0}
                value={s.home}
                onChange={e => setScores(prev => ({ ...prev, [m.id]: { ...prev[m.id], home: e.target.value } }))}
                style={{ width: 44, textAlign: 'center', padding: '4px 6px', borderRadius: 6, border: '1px solid #333', background: '#2a2a2a', color: '#fff', fontSize: 16 }}
              />
              <span style={{ color: '#555' }}>:</span>
              <input
                type="number"
                min={0}
                value={s.away}
                onChange={e => setScores(prev => ({ ...prev, [m.id]: { ...prev[m.id], away: e.target.value } }))}
                style={{ width: 44, textAlign: 'center', padding: '4px 6px', borderRadius: 6, border: '1px solid #333', background: '#2a2a2a', color: '#fff', fontSize: 16 }}
              />
              <span style={{ color: '#fff', fontWeight: 600, flex: 1, minWidth: 80, textAlign: 'left' }}>{m.awayTeam.nameHe}</span>
              <select
                value={s.status}
                onChange={e => setScores(prev => ({ ...prev, [m.id]: { ...prev[m.id], status: e.target.value } }))}
                style={{ padding: '4px 8px', borderRadius: 6, background: '#2a2a2a', color: '#fff', border: '1px solid #333', fontSize: 13 }}
              >
                <option value="FINISHED">FINISHED</option>
                <option value="LIVE">LIVE</option>
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="LOCKED">LOCKED</option>
              </select>
              <button
                onClick={() => save(m.id)}
                disabled={saving === m.id}
                style={{ padding: '6px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, opacity: saving === m.id ? 0.5 : 1 }}
              >
                {saving === m.id ? '...' : 'שמור'}
              </button>
              {s.status === 'FINISHED' && (
                <button
                  onClick={() => sendMinute90Notification(m.id, `${m.homeTeam.nameHe} נגד ${m.awayTeam.nameHe}`)}
                  title="החזר ל-LIVE ושלח התראת 90' ל-OzyB"
                  style={{ padding: '6px 12px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  90' → OzyB
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
