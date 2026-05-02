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
  userPrediction?: { id: string; predictedHomeScore: number; predictedAwayScore: number; predictedTopScorerPlayerId?: string | null; x2Applied?: boolean; shinooApplied?: boolean; x3Applied?: boolean; goalsApplied?: boolean; splitApplied?: boolean } | null
  memberPredictions?: { id: string; predictedHomeScore: number; predictedAwayScore: number; user: { id: string; username: string } }[]
  powerupUsage?: { x2Used: number; shinooUsed: number } | null
}

const STATUS_TABS = [
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
  const [userStock, setUserStock] = useState({ x3Stock: 0, goalsStock: 0, splitStock: 0 })
  const [splitModal, setSplitModal] = useState<Match | null>(null)
  const [splitScores, setSplitScores] = useState({ home: '0', away: '0' })
  const [powerupLoading, setPowerupLoading] = useState<string | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/leagues').then(r => r.json()).then(d => {
      const leagues = d.data || []
      if (leagues.length > 0) setLeagueId(leagues[0].id)
    })
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUserStock({ x3Stock: d.data?.x3Stock ?? 0, goalsStock: d.data?.goalsStock ?? 0, splitStock: d.data?.splitStock ?? 0 })
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
          const hasScheduled = data.some(m => m.status === 'SCHEDULED')
          const hasLocked = data.some(m => m.status === 'LOCKED')
          const defaultTab = hasLive ? 'LIVE' : hasScheduled ? 'SCHEDULED' : hasLocked ? 'LOCKED' : 'FINISHED'
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
            init[m.id] = { home: '0', away: '0', topScorerId: '' }
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
    poll() // sync immediately on mount
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

  const powerupToast = (imgSrc: string) => {
    toast.custom((t) => (
      <div className={`flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl transition-opacity ${t.visible ? 'opacity-100' : 'opacity-0'}`}>
        <img src={imgSrc} className="h-8 w-auto rounded-lg" style={{ mixBlendMode: 'lighten' }} />
        <span className="text-white font-black text-sm">הופעל</span>
        <span className="text-green-400 font-black text-base">✓</span>
      </div>
    ), { duration: 2000 })
  }

  const applyPreMatchPowerup = async (match: Match, type: 'x3' | 'goals' | 'split', splitH?: number, splitA?: number) => {
    if (!match.userPrediction) return
    setPowerupLoading(`${type}-${match.id}`)
    const body: Record<string, unknown> = { predictionId: match.userPrediction.id }
    if (type === 'split') { body.splitHomeScore2 = splitH; body.splitAwayScore2 = splitA }
    const imgMap = { x3: '/btn-x3.jpg', goals: '/btn-goals.jpg', split: '/btn-split.jpg' }
    const res = await fetch(`/api/predictions/${type}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setPowerupLoading(null)
    const data = await res.json()
    if (res.ok) {
      powerupToast(imgMap[type])
      setUserStock(s => ({ ...s, [`${type}Stock`]: Math.max(0, (s as any)[`${type}Stock`] - 1) }))
      setMatches(prev => prev.map(m => m.id !== match.id ? m : {
        ...m, userPrediction: m.userPrediction ? { ...m.userPrediction, [`${type}Applied`]: true } : m.userPrediction
      }))
    } else toast.error(data.error || 'שגיאה')
  }

  return (
    <div className="px-4 py-6 pb-24">


      {splitModal && splitModal.userPrediction && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={() => setSplitModal(null)}>
          <div className="bg-dark-card border border-dark-border rounded-t-3xl p-6 w-full max-w-sm pb-10" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg text-center mb-1">ספליט</h3>
            <p className="text-gray-500 text-xs text-center mb-5">תוצאה ראשונה: <span className="text-primary font-bold">{splitModal.userPrediction.predictedHomeScore}-{splitModal.userPrediction.predictedAwayScore}</span> — בחר שנייה</p>
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setSplitScores(s => ({ ...s, home: String(Math.max(0, parseInt(s.home) - 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">−</button>
                <span className="w-8 text-center text-2xl font-black text-white">{splitScores.home}</span>
                <button onClick={() => setSplitScores(s => ({ ...s, home: String(Math.min(20, parseInt(s.home) + 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">+</button>
              </div>
              <span className="text-gray-500 font-bold">-</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSplitScores(s => ({ ...s, away: String(Math.max(0, parseInt(s.away) - 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">−</button>
                <span className="w-8 text-center text-2xl font-black text-white">{splitScores.away}</span>
                <button onClick={() => setSplitScores(s => ({ ...s, away: String(Math.min(20, parseInt(s.away) + 1)) }))} className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg">+</button>
              </div>
            </div>
            <button onClick={() => { applyPreMatchPowerup(splitModal, 'split', parseInt(splitScores.home), parseInt(splitScores.away)); setSplitModal(null) }} className="w-full py-3 rounded-2xl bg-yellow-500 text-black font-black text-sm mb-2 active:scale-95 transition-all">אשר ספליט</button>
            <button onClick={() => setSplitModal(null)} className="w-full py-3 rounded-2xl bg-dark-50 border border-dark-border text-gray-500 font-medium text-sm">ביטול</button>
          </div>
        </div>
      )}

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

            return (
              <div key={match.id} className={`bg-dark-card border rounded-2xl overflow-hidden ${hasPrediction ? 'border-primary/30' : 'border-dark-border'}`}>

                {/* Row 1: Teams + score/time */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  {/* Home team */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <Flag code={match.homeTeam.code} flagUrl={match.homeTeam.flagUrl} />
                    <span className="text-white text-xs font-semibold text-center leading-tight">{match.homeTeam.nameHe}</span>
                    {(isLive || isPaused || isFinished) && match.userPrediction && (
                      <span className="text-primary font-black text-sm">{match.userPrediction.predictedHomeScore}</span>
                    )}
                  </div>

                  {/* Center */}
                  <div className="text-center px-3 flex-shrink-0">
                    {(isFinished || isLive || isPaused) && match.homeScore !== null ? (
                      <div>
                        <span className={`text-xl font-black ${isLive || isPaused ? 'text-primary' : 'text-white'}`}>
                          {match.homeScore} - {match.awayScore}
                        </span>
                        {isPaused && <div className="text-yellow-400 text-xs font-bold">הפסקה</div>}
                      </div>
                    ) : (
                      <div>
                        <div className="text-white text-sm font-bold">{format(kickoff, 'HH:mm', { locale: he })}</div>
                        <div className="text-gray-500 text-xs">{format(kickoff, 'dd/MM', { locale: he })}</div>
                      </div>
                    )}
                    {match.round && <div className="text-gray-600 text-[10px] mt-0.5">{match.round}</div>}
                  </div>

                  {/* Away team */}
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <Flag code={match.awayTeam.code} flagUrl={match.awayTeam.flagUrl} />
                    <span className="text-white text-xs font-semibold text-center leading-tight">{match.awayTeam.nameHe}</span>
                    {(isLive || isPaused || isFinished) && match.userPrediction && (
                      <span className="text-primary font-black text-sm">{match.userPrediction.predictedAwayScore}</span>
                    )}
                  </div>
                </div>

                {/* Row 2: Stepper (only when open) */}
                {isOpen && (
                  <div className="flex items-center justify-between px-4 pb-4 gap-2 border-t border-dark-border/40 pt-3">
                    {/* Home stepper */}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setScores(prev => ({ ...prev, [match.id]: { ...s, home: String(Math.max(0, parseInt(s.home||'0') - 1)) } }))}
                        className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg active:scale-95 transition-all">−</button>
                      <span className="w-7 text-center text-2xl font-black text-white">{s.home || '0'}</span>
                      <button type="button" onClick={() => setScores(prev => ({ ...prev, [match.id]: { ...s, home: String(Math.min(20, parseInt(s.home||'0') + 1)) } }))}
                        className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg active:scale-95 transition-all">+</button>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={() => save(match)}
                      disabled={saving === match.id}
                      className={`px-5 h-9 rounded-xl font-black text-sm flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all ${
                        hasPrediction ? 'bg-green-500 text-white' : 'bg-white text-black'
                      }`}
                    >
                      {saving === match.id ? '...' : '✓'}
                    </button>

                    {/* Away stepper */}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setScores(prev => ({ ...prev, [match.id]: { ...s, away: String(Math.max(0, parseInt(s.away||'0') - 1)) } }))}
                        className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg active:scale-95 transition-all">−</button>
                      <span className="w-7 text-center text-2xl font-black text-white">{s.away || '0'}</span>
                      <button type="button" onClick={() => setScores(prev => ({ ...prev, [match.id]: { ...s, away: String(Math.min(20, parseInt(s.away||'0') + 1)) } }))}
                        className="w-9 h-9 rounded-full bg-dark-50 border border-dark-border text-white font-bold text-lg active:scale-95 transition-all">+</button>
                    </div>
                  </div>
                )}


                {/* Pre-match powerup buttons */}
                {(() => {
                  if (!isOpen || !hasPrediction) return null
                  const anyApplied = match.userPrediction?.x3Applied || match.userPrediction?.goalsApplied || match.userPrediction?.splitApplied
                  if (anyApplied) {
                    const img = match.userPrediction?.x3Applied ? '/btn-x3.jpg' : match.userPrediction?.goalsApplied ? '/btn-goals.jpg' : '/btn-split.jpg'
                    return (
                      <div className="flex items-center justify-center gap-1.5 px-4 pb-2 pt-1 border-t border-dark-border/40">
                        <img src={img} className="h-5 w-auto rounded" style={{ mixBlendMode: 'lighten' }} />
                        <span className="text-green-400 font-black text-xs">הופעל ✓</span>
                      </div>
                    )
                  }
                  const showX3 = userStock.x3Stock > 0
                  const showGoals = userStock.goalsStock > 0
                  const showSplit = userStock.splitStock > 0
                  if (!showX3 && !showGoals && !showSplit) return null
                  return (
                    <div className="flex gap-3 justify-center px-4 pb-3 pt-1 border-t border-dark-border/40" dir="ltr">
                      {showX3 && <button onClick={() => applyPreMatchPowerup(match, 'x3')} disabled={!!powerupLoading} className="transition-all active:scale-95"><img src="/btn-x3.jpg" className="h-10 w-auto rounded-xl" style={{ mixBlendMode: 'lighten' }} /></button>}
                      {showGoals && <button onClick={() => applyPreMatchPowerup(match, 'goals')} disabled={!!powerupLoading} className="transition-all active:scale-95"><img src="/btn-goals.jpg" className="h-10 w-auto rounded-xl" style={{ mixBlendMode: 'lighten' }} /></button>}
                      {showSplit && <button onClick={() => { setSplitModal(match); setSplitScores({ home: '0', away: '0' }) }} disabled={!!powerupLoading} className="transition-all active:scale-95"><img src="/btn-split.jpg" className="h-10 w-auto rounded-xl" style={{ mixBlendMode: 'lighten' }} /></button>}
                    </div>
                  )
                })()}

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
