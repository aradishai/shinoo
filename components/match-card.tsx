'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Badge, matchStatusToBadgeVariant } from './badge'
import { Countdown } from './countdown'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

interface Team {
  id: string
  nameHe: string
  nameEn: string
  code: string
  flagUrl?: string | null
}

interface Prediction {
  predictedHomeScore: number
  predictedAwayScore: number
  splitApplied?: boolean
  splitHomeScore2?: number | null
  splitAwayScore2?: number | null
}

interface MemberPrediction {
  id: string
  predictedHomeScore: number
  predictedAwayScore: number
  user: { id: string; username: string }
}

interface PowerupProps {
  predictionId: string
  x2Applied: boolean
  shinooApplied: boolean
  x3Applied: boolean
  goalsApplied: boolean
  minute90Applied: boolean
  splitApplied: boolean
  x2Stock: number
  shinooStock: number
  x3Stock: number
  goalsStock: number
  minute90Stock: number
  splitStock: number
  usage: { x2Used: number; shinooUsed: number } | null
  onX2: () => void
  onShinoo: () => void
  onX3: () => void
  onGoals: () => void
  onMinute90: () => void
  onSplit: () => void
  loading?: string | null
}

interface MatchCardProps {
  match: {
    id: string
    homeTeam: Team
    awayTeam: Team
    kickoffAt: Date | string
    lockAt: Date | string
    status: string
    homeScore?: number | null
    awayScore?: number | null
    minute?: number | null
    minuteAt?: string | null
    homeRedCards?: number | null
    awayRedCards?: number | null
    round?: string | null
    tournament?: { type: string } | null
  }
  prediction?: Prediction | null
  memberPredictions?: MemberPrediction[]
  leagueId?: string
  onPredictClick?: () => void
  powerup?: PowerupProps | null
}

// FIFA code → ISO 3166-1 alpha-2 (for flagcdn.com)
const FIFA_TO_ISO: Record<string, string> = {
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', ARG: 'ar', BRA: 'br', COL: 'co',
  ECU: 'ec', URU: 'uy', PAR: 'py', FRA: 'fr', ENG: 'gb-eng', ESP: 'es', GER: 'de',
  POR: 'pt', NED: 'nl', BEL: 'be', CRO: 'hr', SUI: 'ch', AUT: 'at', TUR: 'tr',
  SCO: 'gb-sct', CZE: 'cz', BIH: 'ba', JPN: 'jp', KOR: 'kr', IRN: 'ir', AUS: 'au',
  SAU: 'sa', QAT: 'qa', UZB: 'uz', IRQ: 'iq', MAR: 'ma', SEN: 'sn', EGY: 'eg',
  TUN: 'tn', RSA: 'za', GHA: 'gh', CIV: 'ci', COD: 'cd', NZL: 'nz', HAI: 'ht',
  CUW: 'cw', SWE: 'se', CPV: 'cv', NOR: 'no', ALG: 'dz', JOR: 'jo',
}

function TeamFlag({ code, flagUrl }: { code: string; flagUrl?: string | null }) {
  const iso = FIFA_TO_ISO[code]
  const src = iso
    ? `https://flagcdn.com/w40/${iso}.png`
    : flagUrl || null

  if (src) {
    // Country flags (flagcdn) are rectangular → object-cover
    // Club crests (flagUrl) are square/tall → object-contain, no crop
    const isFlag = !!iso
    return (
      <img
        src={src}
        alt={code}
        className={isFlag ? 'w-9 h-6 object-cover rounded-sm shadow-sm' : 'w-9 h-9 object-contain rounded-sm shadow-sm'}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return <span className="text-xs text-gray-500 font-mono bg-dark-50 px-1 rounded">{code}</span>
}

function useLiveMinute(status: string, kickoffAt: Date | string) {
  const [display, setDisplay] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'LIVE' && status !== 'PAUSED') { setDisplay(null); return }

    const kickoffMs = new Date(kickoffAt).getTime()

    const tick = () => {
      const elapsed = (Date.now() - kickoffMs) / 60_000

      if (elapsed < 1) { setDisplay(null); return }

      if (elapsed <= 45) {
        setDisplay(`${Math.floor(elapsed)}'`)
      } else if (elapsed <= 60) {
        // 15-minute halftime break
        setDisplay('מחצית')
      } else if (elapsed <= 105) {
        // Second half: elapsed 60 → 46', elapsed 105 → 90'
        const m = 46 + Math.floor(elapsed - 60)
        setDisplay(m <= 90 ? `${m}'` : `90+${m - 90}'`)
      } else {
        // Extra time cap at 90+5'
        const extra = Math.min(Math.floor(elapsed - 105), 5)
        setDisplay(`90+${extra}'`)
      }
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [status, kickoffAt])

  return display
}

export function MatchCard({ match, prediction, memberPredictions = [], leagueId, onPredictClick, powerup }: MatchCardProps) {
  const kickoff = new Date(match.kickoffAt)
  const lockAt = new Date(match.lockAt)
  const status = match.status
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'
  const isLocked = status === 'LOCKED' || status === 'LIVE' || status === 'PAUSED'

  const [isOpen, setIsOpen] = useState(status === 'SCHEDULED' && new Date() < lockAt)
  useEffect(() => {
    if (status !== 'SCHEDULED') { setIsOpen(false); return }
    const remaining = lockAt.getTime() - Date.now()
    if (remaining <= 0) { setIsOpen(false); return }
    setIsOpen(true)
    const t = setTimeout(() => setIsOpen(false), remaining)
    return () => clearTimeout(t)
  }, [status, lockAt.getTime()])
  const effectiveStatus = !isOpen && status === 'SCHEDULED' ? 'LOCKED' : status
  const badgeVariant = matchStatusToBadgeVariant(effectiveStatus)
  const liveMinute = useLiveMinute(status, match.kickoffAt)

  const anyApplied = !!powerup && (
    powerup.x2Applied || powerup.shinooApplied || powerup.x3Applied ||
    powerup.goalsApplied || powerup.minute90Applied || powerup.splitApplied
  )
  const appliedImg = !powerup ? null :
    powerup.x2Applied ? '/btn-x2.png' :
    powerup.shinooApplied ? '/btn-shinoo-game.png' :
    powerup.x3Applied ? '/btn-x3.png' :
    powerup.goalsApplied ? '/btn-goals.png' :
    powerup.minute90Applied ? '/btn-90.png' :
    powerup.splitApplied ? '/btn-split.png' : null

  const matchUrl = leagueId
    ? `/matches/${match.id}?leagueId=${leagueId}`
    : `/matches/${match.id}`

  const cardContent = (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {/* RIGHT in RTL: status badge — always a container so left side stays left */}
        <div className="flex-shrink-0">
          <Badge variant={badgeVariant} />
        </div>
        {/* LEFT in RTL: round + powerup applied */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {anyApplied && appliedImg && (
            <div className="flex items-center gap-1">
              <img src={appliedImg} className="h-8 w-auto" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
              <span className="text-green-400 font-black text-sm">✓</span>
            </div>
          )}
          {match.round && <span>{match.round}</span>}
        </div>
      </div>

      {/* Match Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <TeamFlag code={match.homeTeam.code} flagUrl={match.homeTeam.flagUrl} />
          <span className="text-white text-sm font-semibold text-center leading-tight">
            {match.homeTeam.nameHe}
          </span>
          {(match.homeRedCards ?? 0) > 0 && (
            <span className="text-xs leading-none">{'🟥'.repeat(Math.min(match.homeRedCards!, 3))}</span>
          )}
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1 px-2">
          {(isFinished || isLocked) ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {isLive || status === 'PAUSED' ? (match.homeScore ?? 0) : match.homeScore}
                </span>
                <span className="text-gray-500 text-lg">-</span>
                <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {isLive || status === 'PAUSED' ? (match.awayScore ?? 0) : match.awayScore}
                </span>
              </div>
              {(isLive || status === 'PAUSED') && liveMinute && (
                <span className={`text-xs font-bold ${
                  status === 'PAUSED' ? 'text-yellow-400' :
                  liveMinute.includes('+') ? 'text-red-400 animate-pulse' :
                  'text-primary animate-pulse'
                }`}>
                  {liveMinute}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-gray-400 text-sm font-semibold">נגד</span>
            </div>
          )}

          {/* Kickoff time */}
          <div className="text-center">
            {isOpen ? (
              <Countdown
                targetDate={lockAt}
                className="text-xs text-yellow-400 font-medium"
              />
            ) : (
              <span className="text-xs text-gray-500">
                {format(kickoff, 'HH:mm', { locale: he })}
              </span>
            )}
            <div className="text-xs text-gray-600 mt-0.5">
              {format(kickoff, 'dd/MM', { locale: he })}
            </div>
          </div>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <TeamFlag code={match.awayTeam.code} flagUrl={match.awayTeam.flagUrl} />
          <span className="text-white text-sm font-semibold text-center leading-tight">
            {match.awayTeam.nameHe}
          </span>
          {(match.awayRedCards ?? 0) > 0 && (
            <span className="text-xs leading-none">{'🟥'.repeat(Math.min(match.awayRedCards!, 3))}</span>
          )}
        </div>
      </div>

      {/* Predictions */}
      {(prediction || memberPredictions.length > 0) && (
        <div className="mt-3 pt-3 border-t border-dark-border space-y-1.5">
          {prediction && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold text-sm">{prediction.predictedHomeScore} - {prediction.predictedAwayScore}</span>
                <span className="text-xs text-gray-500">{prediction.splitApplied ? 'ניחוש 1' : 'אני'}</span>
              </div>
              {prediction.splitApplied && prediction.splitHomeScore2 != null && prediction.splitAwayScore2 != null && (
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-sm">{prediction.splitHomeScore2} - {prediction.splitAwayScore2}</span>
                  <span className="text-xs text-gray-500">ניחוש 2</span>
                </div>
              )}
            </>
          )}
          {memberPredictions.map((mp) => (
            <div key={mp.id} className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">{mp.predictedHomeScore} - {mp.predictedAwayScore}</span>
              <span className="text-xs text-gray-500">{mp.user.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA — only when open */}
      {isOpen && (
        <div className="mt-3">
          {!prediction ? (
            <div className="bg-white text-black text-center py-2 px-4 rounded-xl text-sm font-black tracking-wide shadow-md active:scale-95 transition-transform w-fit mx-auto">
              נחש עכשיו ›
            </div>
          ) : (
            <div className="bg-dark-muted border border-white/20 text-white text-center py-2 px-4 rounded-xl text-sm font-bold active:scale-95 transition-transform w-fit mx-auto">
              ערוך ניחוש ›
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Unified powerup area — one powerup per match only
  const powerupArea = (() => {
    if (!powerup || isFinished) return null

    // If any powerup already applied — tag in header is enough, nothing here
    if (anyApplied) return null

    // Pre-match buttons (X3, GOALS+, SPLIT) — only when match is open
    if (isOpen) {
      const showX3 = powerup.x3Stock > 0
      const showGoals = powerup.goalsStock > 0
      const showSplit = powerup.splitStock > 0
      if (!showX3 && !showGoals && !showSplit) return null
      return (
        <div className="flex gap-2 justify-center px-4 pb-3 pt-2 border-t border-dark-border/40" dir="ltr">
          {showX3 && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onX3() }} className="transition-all active:scale-95">
              <img src="/btn-x3.png" alt="X3" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
          {showGoals && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onGoals() }} className="transition-all active:scale-95">
              <img src="/btn-goals.png" alt="GOALS+" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
          {showSplit && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onSplit() }} className="transition-all active:scale-95">
              <img src="/btn-split.png" alt="SPLIT" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
        </div>
      )
    }

    // Live buttons: X2/SHINOO only during halftime (status=PAUSED), 90' only when LIVE
    if (isLive || match.status === 'PAUSED') {
      const inHalftimeWindow = match.status === 'PAUSED'
      const before90 = match.status === 'LIVE'

      const showX2 = powerup.x2Stock > 0 && inHalftimeWindow
      const showShinoo = powerup.shinooStock > 0 && inHalftimeWindow
      const showM90 = powerup.minute90Stock > 0 && before90 && !liveMinute?.startsWith('90+')

      if (!showX2 && !showShinoo && !showM90) return null
      return (
        <div className="flex gap-2 justify-center px-4 pb-3 pt-2 border-t border-dark-border/40" dir="ltr">
          {showX2 && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onX2() }} className="transition-all active:scale-95">
              <img src="/btn-x2.png" alt="X2" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
          {showShinoo && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onShinoo() }} className="transition-all active:scale-95">
              <img src="/btn-shinoo-game.png" alt="SHINOO" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
          {showM90 && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); powerup.onMinute90() }} className="transition-all active:scale-95">
              <img src="/btn-90.png" alt="90'" className="h-7 w-20 object-contain rounded-lg" style={{ mixBlendMode: 'lighten' }} loading="lazy" />
            </button>
          )}
        </div>
      )
    }

    return null
  })()

  const outerClass = 'bg-dark-card border border-dark-border rounded-2xl hover:border-primary/30 transition-all duration-200 overflow-hidden'

  if (onPredictClick) {
    return (
      <div className={outerClass}>
        <button className="block w-full text-right active:scale-[0.98]" onClick={onPredictClick}>
          {cardContent}
        </button>
        {powerupArea}
      </div>
    )
  }

  return (
    <div className={outerClass}>
      <Link href={matchUrl} className="block active:scale-[0.98]">
        {cardContent}
      </Link>
      {powerupArea}
    </div>
  )
}
