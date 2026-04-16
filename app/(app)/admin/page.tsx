'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Player { id: string; nameHe: string }
interface Team { id: string; nameHe: string; code: string; players: Player[] }
interface Scorer { playerId: string; goals: number; player: Player }
interface Match {
  id: string
  homeTeam: Team
  awayTeam: Team
  kickoffAt: string
  status: string
  homeScore: number | null
  awayScore: number | null
  round: string | null
  scorers: Scorer[]
}

const FIFA_TO_ISO: Record<string, string> = {
  MEX:'mx',RSA:'za',KOR:'kr',CZE:'cz',CAN:'ca',BIH:'ba',QAT:'qa',SUI:'ch',
  HAI:'ht',SCO:'gb-sct',BRA:'br',MAR:'ma',USA:'us',PAR:'py',AUS:'au',TUR:'tr',
  GER:'de',CUW:'cw',CIV:'ci',ECU:'ec',NED:'nl',JPN:'jp',SWE:'se',TUN:'tn',
  BEL:'be',EGY:'eg',IRN:'ir',NZL:'nz',ESP:'es',CPV:'cv',SAU:'sa',URU:'uy',
  FRA:'fr',SEN:'sn',IRQ:'iq',NOR:'no',ARG:'ar',ALG:'dz',AUT:'at',JOR:'jo',
  POR:'pt',COD:'cd',UZB:'uz',COL:'co',ENG:'gb-eng',CRO:'hr',GHA:'gh',PAN:'pa',
}

function Flag({ code }: { code: string }) {
  const iso = FIFA_TO_ISO[code]
  if (!iso) return <span className="text-xs text-gray-500">{code}</span>
  return <img src={`https://flagcdn.com/w40/${iso}.png`} alt={code} className="w-7 h-5 object-cover rounded-sm inline-block" />
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [openMatch, setOpenMatch] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string; status: string }>>({})
  const [newScorer, setNewScorer] = useState<Record<string, { playerId: string; goals: string }>>({})
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/admin/matches')
      .then(r => r.json())
      .then(d => {
        setMatches(d.data || [])
        const s: Record<string, { home: string; away: string; status: string }> = {}
        for (const m of d.data || []) {
          s[m.id] = {
            home: m.homeScore?.toString() ?? '',
            away: m.awayScore?.toString() ?? '',
            status: m.status,
          }
        }
        setScores(s)
      })
      .finally(() => setLoading(false))
  }, [])

  const saveResult = async (matchId: string) => {
    const s = scores[matchId]
    if (s.home === '' || s.away === '') { toast.error('הכנס תוצאה'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/matches/${matchId}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: s.home, awayScore: s.away, status: s.status }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('תוצאה נשמרה ונקודות חושבו!')
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, homeScore: parseInt(s.home), awayScore: parseInt(s.away), status: s.status } : m))
    } else toast.error('שגיאה')
  }

  const addScorer = async (matchId: string, homeTeam: Team, awayTeam: Team) => {
    const ns = newScorer[matchId]
    if (!ns?.playerId) { toast.error('בחר שחקן'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/matches/${matchId}/scorers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: ns.playerId, goals: ns.goals || '1' }),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      toast.success('כובש נוסף!')
      setMatches(prev => prev.map(m => {
        if (m.id !== matchId) return m
        const existing = m.scorers.find(s => s.playerId === data.data.playerId)
        if (existing) {
          return { ...m, scorers: m.scorers.map(s => s.playerId === data.data.playerId ? data.data : s) }
        }
        return { ...m, scorers: [...m.scorers, data.data] }
      }))
      setNewScorer(prev => ({ ...prev, [matchId]: { playerId: '', goals: '1' } }))
    } else toast.error('שגיאה')
  }

  const removeScorer = async (matchId: string, playerId: string) => {
    await fetch(`/api/admin/matches/${matchId}/scorers`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    setMatches(prev => prev.map(m => m.id !== matchId ? m : { ...m, scorers: m.scorers.filter(s => s.playerId !== playerId) }))
    toast.success('הוסר')
  }

  const filtered = matches.filter(m =>
    !filter || m.homeTeam.nameHe.includes(filter) || m.awayTeam.nameHe.includes(filter) || (m.round || '').includes(filter)
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-4xl animate-bounce">⚽</div>
    </div>
  )

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="w-8" />
        <h1 className="text-white font-black text-xl">ניהול תוצאות</h1>
        <div className="w-8" />
      </div>

      <input
        type="text"
        placeholder="חיפוש קבוצה / בית..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none mb-4 text-right"
      />

      <div className="space-y-3">
        {filtered.map(match => {
          const s = scores[match.id] || { home: '', away: '', status: match.status }
          const isOpen = openMatch === match.id
          const allPlayers = [...match.homeTeam.players, ...match.awayTeam.players]

          return (
            <div key={match.id} className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              {/* Match Row */}
              <button
                className="w-full p-4 flex items-center justify-between gap-3 text-right"
                onClick={() => setOpenMatch(isOpen ? null : match.id)}
              >
                <span className="text-primary text-xs font-bold">
                  {isOpen ? '▲ סגור' : '▼ ערוך'}
                </span>
                <div className="flex-1 flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <Flag code={match.awayTeam.code} />
                    <span className="text-white text-xs font-semibold">{match.awayTeam.nameHe}</span>
                  </div>
                  <div className="text-center">
                    {match.homeScore !== null && match.awayScore !== null ? (
                      <span className="text-primary font-black text-lg">{match.homeScore} - {match.awayScore}</span>
                    ) : (
                      <span className="text-gray-500 text-xs">{format(new Date(match.kickoffAt), 'dd/MM HH:mm', { locale: he })}</span>
                    )}
                    <div className="text-xs text-gray-600 mt-0.5">{match.round}</div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Flag code={match.homeTeam.code} />
                    <span className="text-white text-xs font-semibold">{match.homeTeam.nameHe}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  match.status === 'FINISHED' ? 'bg-gray-700 text-gray-400' :
                  match.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                  'bg-primary/10 text-primary'
                }`}>
                  {match.status === 'FINISHED' ? 'הסתיים' : match.status === 'LIVE' ? 'לייב' : 'מתוכנן'}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-dark-border p-4 space-y-4">
                  {/* Score Entry */}
                  <div>
                    <p className="text-gray-400 text-sm font-medium mb-3 text-right">הזן תוצאה</p>
                    <div className="flex items-center gap-3 mb-3">
                      {/* Away score (right in RTL) */}
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-gray-500 text-xs">{match.awayTeam.nameHe}</span>
                        <input
                          type="number" min={0} max={20}
                          value={s.away}
                          onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))}
                          className="w-16 h-12 text-center text-2xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                        />
                      </div>
                      <span className="text-gray-500 text-xl font-bold">-</span>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-gray-500 text-xs">{match.homeTeam.nameHe}</span>
                        <input
                          type="number" min={0} max={20}
                          value={s.home}
                          onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))}
                          className="w-16 h-12 text-center text-2xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    <select
                      value={s.status}
                      onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, status: e.target.value } }))}
                      className="w-full bg-dark-50 border border-dark-border rounded-xl px-4 py-2.5 text-white text-sm mb-3 focus:border-primary focus:outline-none appearance-none"
                    >
                      <option value="SCHEDULED">מתוכנן</option>
                      <option value="LIVE">בלייב</option>
                      <option value="FINISHED">הסתיים</option>
                    </select>

                    <button
                      onClick={() => saveResult(match.id)}
                      disabled={saving}
                      className="w-full bg-primary text-black font-black py-3 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {saving ? 'שומר...' : 'שמור תוצאה + חשב נקודות'}
                    </button>
                  </div>

                  {/* Scorers */}
                  <div>
                    <p className="text-gray-400 text-sm font-medium mb-3 text-right">כובשי שערים</p>

                    {match.scorers.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {match.scorers.map(scorer => (
                          <div key={scorer.playerId} className="flex items-center justify-between bg-dark-50 rounded-xl px-3 py-2">
                            <button
                              onClick={() => removeScorer(match.id, scorer.playerId)}
                              className="text-red-400 text-sm hover:text-red-300 font-bold"
                            >
                              הסר
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-bold text-sm">{scorer.goals} ⚽</span>
                              <span className="text-white font-medium text-sm">{scorer.player.nameHe}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add scorer */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => addScorer(match.id, match.homeTeam, match.awayTeam)}
                        disabled={saving}
                        className="bg-secondary text-black font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        + הוסף
                      </button>
                      <input
                        type="number" min={1} max={10}
                        placeholder="שערים"
                        value={newScorer[match.id]?.goals ?? '1'}
                        onChange={e => setNewScorer(prev => ({ ...prev, [match.id]: { ...prev[match.id], goals: e.target.value } }))}
                        className="w-16 bg-dark-50 border border-dark-border rounded-xl px-2 py-2.5 text-white text-center text-sm focus:border-primary focus:outline-none"
                      />
                      <select
                        value={newScorer[match.id]?.playerId ?? ''}
                        onChange={e => setNewScorer(prev => ({ ...prev, [match.id]: { ...prev[match.id], playerId: e.target.value } }))}
                        className="flex-1 bg-dark-50 border border-dark-border rounded-xl px-3 py-2.5 text-white text-sm focus:border-primary focus:outline-none appearance-none"
                      >
                        <option value="">בחר שחקן</option>
                        <optgroup label={match.homeTeam.nameHe}>
                          {match.homeTeam.players.map(p => (
                            <option key={p.id} value={p.id}>{p.nameHe}</option>
                          ))}
                        </optgroup>
                        <optgroup label={match.awayTeam.nameHe}>
                          {match.awayTeam.players.map(p => (
                            <option key={p.id} value={p.id}>{p.nameHe}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
