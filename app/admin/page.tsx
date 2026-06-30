'use client'
import { useState, useEffect } from 'react'

const SECRET = 'shinoo-admin-2026'

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

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [scores, setScores] = useState<Record<string, { home: string; away: string; status: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authed) return
    fetch('/api/admin/matches')
      .then(r => r.json())
      .then(({ data }) => {
        const recent = (data as Match[])
          .filter(m => {
            const d = new Date(m.kickoffAt)
            return d > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
          })
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
  }, [authed])

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ color: '#fff', fontSize: 20 }}>Admin</h1>
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password === SECRET) setAuthed(true) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 16, textAlign: 'center' }}
        />
        <button
          onClick={() => { if (password === SECRET) setAuthed(true) }}
          style={{ padding: '8px 24px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16 }}
        >
          כניסה
        </button>
      </div>
    )
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

  return (
    <div style={{ minHeight: '100vh', background: '#111', padding: '24px 16px', direction: 'rtl' }}>
      <h1 style={{ color: '#fff', marginBottom: 16, fontSize: 20 }}>עריכת תוצאות</h1>
      {message && <div style={{ color: message.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 12 }}>{message}</div>}
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
