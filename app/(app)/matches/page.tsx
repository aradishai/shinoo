'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge, matchStatusToBadgeVariant } from '@/components/badge'
import { Countdown } from '@/components/countdown'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import toast from 'react-hot-toast'

const FIFA_TO_ISO: Record<string, string> = {
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', ARG: 'ar', BRA: 'br', COL: 'co',
  ECU: 'ec', URU: 'uy', PAR: 'py', FRA: 'fr', ENG: 'gb-eng', ESP: 'es', GER: 'de',
  POR: 'pt', NED: 'nl', BEL: 'be', CRO: 'hr', SUI: 'ch', AUT: 'at', TUR: 'tr',
  SCO: 'gb-sct', CZE: 'cz', BIH: 'ba', JPN: 'jp', KOR: 'kr', IRN: 'ir', AUS: 'au',
  SAU: 'sa', QAT: 'qa', UZB: 'uz', IRQ: 'iq', MAR: 'ma', SEN: 'sn', EGY: 'eg',
  TUN: 'tn', RSA: 'za', GHA: 'gh', CIV: 'ci', COD: 'cd', NZL: 'nz', HAI: 'ht',
  CUW: 'cw', SWE: 'se', CPV: 'cv', NOR: 'no', ALG: 'dz', JOR: 'jo',
}

function Flag({ code }: { code: string }) {
  const iso = FIFA_TO_ISO[code]
  if (!iso) return <span className="text-xs text-gray-500 font-mono">{code}</span>
  return (
    <img src={`https://flagcdn.com/w40/${iso}.png`} alt={code}
      className="w-9 h-6 object-cover rounded-sm shadow-sm"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
  )
}

interface Player { id: string; nameHe: string }
interface Team { id: string; nameHe: string; code: string; players: Player[] }
interface Match {
  id: string
  homeTeam: Team
  awayTeam: Team
  kickoffAt: string
  lockAt: string
  status: string
  homeScore?: number | null
  awayScore?: number | null
  round?: string | null
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; predictedTopScorerPlayerId?: string | null } | null
}

const STATUS_TABS = [
  { label: 'הכל', value: '' },
  { label: 'פתוח', value: 'SCHEDULED' },
  { label: 'נעול', value: 'LOCKED' },
  { label: 'בלייב', value: 'LIVE' },
  { label: 'הסתיים', value: 'FINISHED' },
]

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('')
  const [leagueId, setLeagueId] = useState<string | null>(null)
  // scores[matchId] = { home, away, topScorerId }
  const [scores, setScores] = useState<Record<string, { home: string; away: string; topScorerId: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // load league once
  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const leagues = d.data || []
      if (leagues.length > 0) setLeagueId(leagues[0].id)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = activeStatus ? `/api/matches?status=${activeStatus}` : '/api/matches'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const data: Match[] = d.data || []
        setMatches(data)
        // init scores from existing predictions
        const init: Record<string, { home: string; away: string; topScorerId: string }> = {}
        for (const m of data) {
          if (m.userPrediction) {
            init[m.id] = {
              home: m.userPrediction.predictedHomeScore.toString(),
              away: m.userPrediction.predictedAwayScore.toString(),
              topScorerId: m.userPrediction.predictedTopScorerPlayerId || '',
            }
          }
        }
        setScores(prev => ({ ...init, ...prev }))
      })
      .finally(() => setLoading(false))
  }, [activeStatus])

  const savePrediction = async (match: Match) => {
    const s = scores[match.id]
    if (!s || s.home === '' || s.away === '') {
      toast.error('יש להזין תוצאה')
      return
    }
    if (!leagueId) {
      toast.error('אין ליגה')
      return
    }

    setSaving(match.id)
    const existing = match.userPrediction
    const endpoint = existing ? `/api/predictions/${existing.id}` : '/api/predictions'
    const method = existing ? 'PUT' : 'POST'
    const body: Record<string, unknown> = {
      predictedHomeScore: parseInt(s.home),
      predictedAwayScore: parseInt(s.away),
      predictedTopScorerPlayerId: s.topScorerId || null,
    }
    if (!existing) { body.matchId = match.id; body.leagueId = leagueId }

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(null)
    if (res.ok) {
      const data = await res.json()
      toast.success('נשמר!')
      setMatches(prev => prev.map(m => m.id !== match.id ? m : {
        ...m,
        userPrediction: {
          id: data.data?.id || existing?.id || '',
          predictedHomeScore: parseInt(s.home),
          predictedAwayScore: parseInt(s.away),
          predictedTopScorerPlayerId: s.topScorerId || null,
        }
      }))
    } else {
      const data = await res.json()
      toast.error(data.error || 'שגיאה')
    }
  }

  const getScore = (matchId: string) =>
    scores[matchId] || { home: '', away: '', topScorerId: '' }

  const setScore = (matchId: string, field: 'home' | 'away' | 'topScorerId', value: string) =>
    setScores(prev => ({ ...prev, [matchId]: { ...getScore(matchId), [field]: value } }))

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors">← חזרה</Link>
        <h1 className="text-white font-black text-xl">כל המשחקים</h1>
        <div className="w-12" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 justify-end">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveStatus(tab.value)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeStatus === tab.value
                ? 'bg-primary text-black'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-dark-card border border-dark-border rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📅</div>
          <p>אין משחקים להצגה</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(match => {
            const lockAt = new Date(match.lockAt)
            const kickoff = new Date(match.kickoffAt)
            const isOpen = match.status === 'SCHEDULED' && new Date() < lockAt
            const isFinished = match.status === 'FINISHED'
            const isLive = match.status === 'LIVE'
            const s = getScore(match.id)
            const allPlayers = [...(match.homeTeam.players || []), ...(match.awayTeam.players || [])]

            return (
              <div key={match.id} className="bg-dark-card border border-dark-border rounded-2xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={matchStatusToBadgeVariant(match.status)} />
                  <span className="text-xs text-gray-500">{match.round}</span>
                </div>

                {/* Teams row */}
                <div className="flex items-center gap-2 mb-4">
                  {/* Home */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <Flag code={match.homeTeam.code} />
                    <span className="text-white text-xs font-semibold text-center">{match.homeTeam.nameHe}</span>
                  </div>

                  {/* Score / time */}
                  <div className="flex flex-col items-center gap-1 px-2">
                    {(isFinished || isLive) && match.homeScore !== null && match.awayScore !== null ? (
                      <span className={`text-xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm font-semibold">נגד</span>
                    )}
                    {isOpen ? (
                      <Countdown targetDate={lockAt} className="text-xs text-yellow-400 font-medium" />
                    ) : (
                      <span className="text-xs text-gray-500">{format(kickoff, 'HH:mm dd/MM', { locale: he })}</span>
                    )}
                  </div>

                  {/* Away */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <Flag code={match.awayTeam.code} />
                    <span className="text-white text-xs font-semibold text-center">{match.awayTeam.nameHe}</span>
                  </div>
                </div>

                {/* Prediction inputs - only for open matches */}
                {isOpen && leagueId && (
                  <div className="border-t border-dark-border pt-3 space-y-3">
                    {/* Score inputs */}
                    <div className="flex items-center justify-center gap-3">
                      <input type="number" min={0} max={20} placeholder="0"
                        value={s.home}
                        onChange={e => setScore(match.id, 'home', e.target.value)}
                        className="w-14 h-12 text-center text-2xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                      />
                      <span className="text-gray-500 text-lg font-bold">-</span>
                      <input type="number" min={0} max={20} placeholder="0"
                        value={s.away}
                        onChange={e => setScore(match.id, 'away', e.target.value)}
                        className="w-14 h-12 text-center text-2xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Top scorer */}
                    {allPlayers.length > 0 && (
                      <select value={s.topScorerId}
                        onChange={e => setScore(match.id, 'topScorerId', e.target.value)}
                        className="w-full bg-dark-50 border border-dark-border rounded-xl px-3 py-2 text-white text-sm focus:border-primary focus:outline-none appearance-none">
                        <option value="">מלך שערים</option>
                        <optgroup label={match.homeTeam.nameHe}>
                          {(match.homeTeam.players || []).map(p => (
                            <option key={p.id} value={p.id}>{p.nameHe}</option>
                          ))}
                        </optgroup>
                        <optgroup label={match.awayTeam.nameHe}>
                          {(match.awayTeam.players || []).map(p => (
                            <option key={p.id} value={p.id}>{p.nameHe}</option>
                          ))}
                        </optgroup>
                      </select>
                    )}

                    <button
                      onClick={() => savePrediction(match)}
                      disabled={saving === match.id || s.home === '' || s.away === ''}
                      className="w-full bg-primary text-black font-black py-2.5 rounded-xl hover:bg-primary-400 active:scale-95 transition-all disabled:opacity-50 text-sm"
                    >
                      {saving === match.id ? 'שומר...' : match.userPrediction ? 'עדכן ניחוש' : 'שמור ניחוש'}
                    </button>
                  </div>
                )}

                {/* Show existing prediction for locked matches */}
                {!isOpen && match.userPrediction && (
                  <div className="border-t border-dark-border pt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">הניחוש שלי</span>
                    <span className="text-sm font-bold text-primary">
                      {match.userPrediction.predictedHomeScore} - {match.userPrediction.predictedAwayScore}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
