'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
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
  ARS: 'gb-eng', MCI: 'gb-eng',
}

function Flag({ code, flagUrl }: { code: string; flagUrl?: string | null }) {
  if (flagUrl) return <img src={flagUrl} alt={code} className="w-8 h-8 object-contain rounded-sm inline-block" />
  const iso = FIFA_TO_ISO[code]
  if (!iso) return <span className="text-xs text-gray-500">{code}</span>
  return <img src={`https://flagcdn.com/w40/${iso}.png`} alt={code} className="w-8 h-5 object-cover rounded-sm inline-block" />
}

interface Player { id: string; nameHe: string }
interface Team { id: string; nameHe: string; code: string; flagUrl?: string | null; players: Player[] }
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
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; predictedTopScorerPlayerId?: string | null; x2Applied?: boolean; shinooApplied?: boolean } | null
  memberPredictions?: { id: string; predictedHomeScore: number; predictedAwayScore: number; user: { id: string; username: string } }[]
  powerupUsage?: { x2Used: number; shinooUsed: number } | null
}

const STATUS_TABS = [
  { label: 'הכל', value: '' },
  { label: 'חי', value: 'LIVE' },
  { label: 'נעול', value: 'LOCKED' },
  { label: 'פתוח', value: 'SCHEDULED' },
  { label: 'הסתיים', value: 'FINISHED' },
]

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('')
  const [defaultSet, setDefaultSet] = useState(false)
  const [leagueId, setLeagueId] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string; topScorerId: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [powerupLoading, setPowerupLoading] = useState<string | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const leagues = d.data || []
      if (leagues.length > 0) setLeagueId(leagues[0].id)
    })
  }, [])

  const loadMatches = useCallback(() => {
    setLoading(true)
    // LIVE tab also fetches PAUSED matches (half-time)
    const url = activeStatus === 'LIVE'
      ? '/api/matches?status=LIVE,PAUSED'
      : activeStatus ? `/api/matches?status=${activeStatus}` : '/api/matches'
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const data: Match[] = d.data || []

        // On first load (all matches), pick the smartest default tab
        if (!defaultSet && activeStatus === '') {
          const hasLive = data.some(m => m.status === 'LIVE' || m.status === 'PAUSED')
          const hasLocked = data.some(m => m.status === 'LOCKED')
          const defaultTab = hasLive ? 'LIVE' : hasLocked ? 'LOCKED' : 'SCHEDULED'
          setDefaultSet(true)
          setActiveStatus(defaultTab)
          return
        }

        setMatches(data)
        const init: Record<string, { home: string; away: string; topScorerId: string }> = {}
        for (const m of data) {
          if (m.userPrediction) {
            init[m.id] = {
              home: m.userPrediction.predictedHomeScore.toString(),
              away: m.userPrediction.predictedAwayScore.toString(),
              topScorerId: m.userPrediction.predictedTopScorerPlayerId || '',
            }
          } else {
            init[m.id] = { home: '', away: '', topScorerId: '' }
          }
        }
        setScores(init)
      })
      .finally(() => setLoading(false))
  }, [activeStatus])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/sync/live')
        const data = await res.json()
        if (data.synced) loadMatches()
      } catch { /* silent */ }
    }
    syncIntervalRef.current = setInterval(poll, 60_000)
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current) }
  }, [loadMatches])

  const save = async (match: Match) => {
    const s = scores[match.id]
    if (!s || s.home === '' || s.away === '') { toast.error('הכנס תוצאה'); return }
    if (!leagueId) { toast.error('אין ליגה'); return }

    setSaving(match.id)
    const existing = match.userPrediction
    const res = await fetch(existing ? `/api/predictions/${existing.id}` : '/api/predictions', {
      method: existing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictedHomeScore: parseInt(s.home),
        predictedAwayScore: parseInt(s.away),
        predictedTopScorerPlayerId: s.topScorerId || null,
        ...(!existing && { matchId: match.id, leagueId }),
      }),
    })
    setSaving(null)
    if (res.ok) {
      const data = await res.json()
      toast.success('✓')
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

  const applyX2 = async (match: Match) => {
    if (!match.userPrediction) return
    setPowerupLoading(`x2-${match.id}`)
    const res = await fetch('/api/predictions/x2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      toast.success(`X2 הופעל! נשאר: ${data.remaining}`)
      setMatches(prev => prev.map(m => m.id !== match.id ? m : {
        ...m,
        userPrediction: m.userPrediction ? { ...m.userPrediction, x2Applied: true } : m.userPrediction,
        powerupUsage: m.powerupUsage ? { ...m.powerupUsage, x2Used: (m.powerupUsage.x2Used || 0) + 1 } : m.powerupUsage,
      }))
    } else {
      toast.error(data.error || 'שגיאה')
    }
  }

  const applyShinoo = async (match: Match, team: 'home' | 'away', delta: 1 | -1) => {
    if (!match.userPrediction) return
    setPowerupLoading(`shinoo-${match.id}`)
    const res = await fetch('/api/predictions/shinoo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: match.userPrediction.id, team, delta }),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      toast.success(`SHINOO הופעל! נשאר: ${data.remaining}`)
      setMatches(prev => prev.map(m => m.id !== match.id ? m : {
        ...m,
        userPrediction: m.userPrediction ? {
          ...m.userPrediction,
          predictedHomeScore: data.newHome,
          predictedAwayScore: data.newAway,
          shinooApplied: true,
        } : m.userPrediction,
        powerupUsage: m.powerupUsage ? { ...m.powerupUsage, shinooUsed: (m.powerupUsage.shinooUsed || 0) + 1 } : m.powerupUsage,
      }))
    } else {
      toast.error(data.error || 'שגיאה')
    }
  }

  return (
    <div className="px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm font-medium text-gray-300 bg-dark-card border border-dark-border px-3 py-1.5 rounded-xl hover:border-primary/40 hover:text-white transition-all">בית</Link>
        <h1 className="text-white font-black text-xl">ניחושים</h1>
        <div className="w-12" />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 justify-end">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveStatus(tab.value)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeStatus === tab.value ? 'bg-primary text-black' : 'bg-dark-card border border-dark-border text-gray-400'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-dark-card rounded-2xl h-20 animate-pulse" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">אין משחקים</div>
      ) : (
        <div className="space-y-2">
          {matches.map(match => {
            const lockAt = new Date(match.lockAt)
            const kickoff = new Date(match.kickoffAt)
            const isOpen = match.status === 'SCHEDULED' && new Date() < lockAt
            const isFinished = match.status === 'FINISHED'
            const isLive = match.status === 'LIVE'
            const isPaused = match.status === 'PAUSED'
            const s = scores[match.id] || { home: '', away: '', topScorerId: '' }
            const hasPrediction = !!match.userPrediction
            const allPlayers = [...(match.homeTeam.players || []), ...(match.awayTeam.players || [])]

            return (
              <div key={match.id} className={`bg-dark-card border rounded-2xl p-4 ${hasPrediction ? 'border-primary/30' : 'border-dark-border'}`}>
                <div className="flex items-center gap-3">

                  {/* ✓ button - right edge */}
                  {isOpen && (
                    <button
                      onClick={() => save(match)}
                      disabled={saving === match.id || s.home === '' || s.away === ''}
                      className={`w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0 ${
                        hasPrediction ? 'bg-green-500 text-white' : 'bg-primary text-black'
                      }`}
                    >
                      {saving === match.id ? '...' : '✓'}
                    </button>
                  )}

                  {/* Away team + input */}
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <span className="text-white text-xs font-semibold">{match.awayTeam.nameHe}</span>
                    <Flag code={match.awayTeam.code} flagUrl={match.awayTeam.flagUrl} />
                    {isOpen ? (
                      <input type="number" min={0} max={20} placeholder="0"
                        value={s.away}
                        onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, away: e.target.value } }))}
                        className="w-12 h-10 text-center text-xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                      />
                    ) : (isLive || isPaused || isFinished) && match.userPrediction ? (
                      <span className="text-primary font-black text-xl">{match.userPrediction.predictedAwayScore}</span>
                    ) : null}
                  </div>

                  {/* Center: time / result */}
                  <div className="text-center flex-shrink-0">
                    {(isFinished || isLive || isPaused) && match.homeScore !== null ? (
                      <>
                        <span className={`text-sm font-black ${isLive || isPaused ? 'text-primary' : 'text-white'}`}>
                          {match.homeScore}-{match.awayScore}
                        </span>
                        {isPaused && <div className="text-yellow-400 text-xs font-bold mt-0.5">הפסקה</div>}
                      </>
                    ) : (
                      <span className="text-gray-500 text-xs">{format(kickoff, 'HH:mm dd/MM', { locale: he })}</span>
                    )}
                    {match.round && <div className="text-gray-600 text-xs">{match.round}</div>}
                  </div>

                  {/* Home team + input */}
                  <div className="flex flex-col items-center gap-3 flex-1">
                    <span className="text-white text-xs font-semibold">{match.homeTeam.nameHe}</span>
                    <Flag code={match.homeTeam.code} flagUrl={match.homeTeam.flagUrl} />
                    {isOpen ? (
                      <input type="number" min={0} max={20} placeholder="0"
                        value={s.home}
                        onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...s, home: e.target.value } }))}
                        className="w-12 h-10 text-center text-xl font-black bg-dark-50 border-2 border-dark-border rounded-xl text-white focus:border-primary focus:outline-none"
                      />
                    ) : (isLive || isPaused || isFinished) && match.userPrediction ? (
                      <span className="text-primary font-black text-xl">{match.userPrediction.predictedHomeScore}</span>
                    ) : null}
                  </div>

                </div>

                {/* Powerup buttons — half-time only */}
                {isPaused && match.userPrediction && match.powerupUsage && (
                  <div className="mt-3 pt-3 border-t border-dark-border/50">
                    <div className="flex gap-2 justify-center">
                      {/* X2 */}
                      {!match.userPrediction.x2Applied && match.powerupUsage.x2Used < 2 ? (
                        <button
                          onClick={() => applyX2(match)}
                          disabled={powerupLoading === `x2-${match.id}`}
                          className="flex-1 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-black text-sm active:scale-95 transition-all disabled:opacity-40"
                        >
                          {powerupLoading === `x2-${match.id}` ? '...' : `X2 (${2 - match.powerupUsage.x2Used} נשאר)`}
                        </button>
                      ) : (
                        <div className="flex-1 py-2 rounded-xl bg-dark-50 border border-dark-border/30 text-gray-600 font-black text-sm text-center">
                          {match.userPrediction.x2Applied ? 'X2 הופעל ✓' : 'X2 נוצל'}
                        </div>
                      )}

                      {/* SHINOO */}
                      {!match.userPrediction.shinooApplied && match.powerupUsage.shinooUsed < 2 ? (
                        <div className="flex-1 flex flex-col gap-1">
                          <div className="text-center text-xs text-purple-400 font-bold">שינוי ({2 - match.powerupUsage.shinooUsed} נשאר)</div>
                          <div className="flex gap-1">
                            <button onClick={() => applyShinoo(match, 'home', 1)} disabled={!!powerupLoading} className="flex-1 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold active:scale-95 transition-all disabled:opacity-40">
                              {match.homeTeam.nameHe.slice(0, 4)} +1
                            </button>
                            <button onClick={() => applyShinoo(match, 'home', -1)} disabled={!!powerupLoading} className="flex-1 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold active:scale-95 transition-all disabled:opacity-40">
                              {match.homeTeam.nameHe.slice(0, 4)} -1
                            </button>
                            <button onClick={() => applyShinoo(match, 'away', 1)} disabled={!!powerupLoading} className="flex-1 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold active:scale-95 transition-all disabled:opacity-40">
                              {match.awayTeam.nameHe.slice(0, 4)} +1
                            </button>
                            <button onClick={() => applyShinoo(match, 'away', -1)} disabled={!!powerupLoading} className="flex-1 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold active:scale-95 transition-all disabled:opacity-40">
                              {match.awayTeam.nameHe.slice(0, 4)} -1
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 py-2 rounded-xl bg-dark-50 border border-dark-border/30 text-gray-600 font-black text-sm text-center">
                          {match.userPrediction.shinooApplied ? 'שינוי הופעל ✓' : 'שינוי נוצל'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Member predictions for finished/live/locked matches */}
                {(isFinished || isLive || isPaused || match.status === 'LOCKED') && match.memberPredictions && match.memberPredictions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dark-border/50 space-y-1">
                    {match.memberPredictions.map((mp: any) => (
                      <div key={mp.id} className="flex items-center justify-between text-xs">
                        <span className="text-primary font-bold">{mp.predictedHomeScore}-{mp.predictedAwayScore}</span>
                        <span className="text-gray-500">{mp.user.username}</span>
                      </div>
                    ))}
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
