'use client'

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
  usage: { x2Used: number; shinooUsed: number } | null
  onX2: () => void
  onShinoo: () => void
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
    round?: string | null
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
    return (
      <img
        src={src}
        alt={code}
        className="w-9 h-6 object-cover rounded-sm shadow-sm"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return <span className="text-xs text-gray-500 font-mono bg-dark-50 px-1 rounded">{code}</span>
}

export function MatchCard({ match, prediction, memberPredictions = [], leagueId, onPredictClick, powerup }: MatchCardProps) {
  const kickoff = new Date(match.kickoffAt)
  const lockAt = new Date(match.lockAt)
  const status = match.status
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'
  const isLocked = status === 'LOCKED' || status === 'LIVE' || status === 'PAUSED'
  const isOpen = status === 'SCHEDULED' && new Date() < lockAt
  const badgeVariant = matchStatusToBadgeVariant(status)

  const matchUrl = leagueId
    ? `/matches/${match.id}?leagueId=${leagueId}`
    : `/matches/${match.id}`

  const cardContent = (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant={badgeVariant} />
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {match.round && <span>{match.round}</span>}
        </div>
      </div>

      {/* Match Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home Team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <TeamFlag code={match.homeTeam.code} flagUrl={match.homeTeam.flagUrl} />
          <span className="text-white text-sm font-semibold text-center leading-tight">
            {match.homeTeam.nameHe}
          </span>
        </div>

        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1 px-2">
          {(isFinished || isLive || isLocked) && match.homeScore !== null && match.awayScore !== null ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {match.homeScore}
                </span>
                <span className="text-gray-500 text-lg">-</span>
                <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                  {match.awayScore}
                </span>
              </div>
              {isLive && (
                <span className="text-xs text-primary font-bold animate-pulse">
                  {match.minute ? `${match.minute}'` : 'LIVE'}
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
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <TeamFlag code={match.awayTeam.code} flagUrl={match.awayTeam.flagUrl} />
          <span className="text-white text-sm font-semibold text-center leading-tight">
            {match.awayTeam.nameHe}
          </span>
        </div>
      </div>

      {/* Predictions */}
      {(prediction || memberPredictions.length > 0) && (
        <div className="mt-3 pt-3 border-t border-dark-border space-y-1.5">
          {prediction && (
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold text-sm">{prediction.predictedHomeScore} - {prediction.predictedAwayScore}</span>
              <span className="text-xs text-gray-500">אני</span>
            </div>
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
            <div className="bg-primary/10 border border-primary/30 text-primary text-center py-2 rounded-xl text-sm font-bold">
              נחש עכשיו
            </div>
          ) : (
            <div className="bg-dark-muted text-gray-300 text-center py-2 rounded-xl text-sm font-medium">
              ערוך ניחוש
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Powerup buttons — inside the card but outside the Link click area
  const powerupRow = (() => {
    if (!powerup || isFinished) return null
    const now = Date.now()
    const kickoffMs = new Date(match.kickoffAt).getTime()
    const inWindow = (isLive || match.status === 'PAUSED') && now >= kickoffMs + 45 * 60 * 1000 && now <= kickoffMs + 65 * 60 * 1000
    const usage = powerup.usage || { x2Used: 0, shinooUsed: 0 }
    const x2Done = powerup.x2Applied
    const shinooDone = powerup.shinooApplied
    const x2Exhausted = !x2Done && usage.x2Used >= 2
    const shinooExhausted = !shinooDone && usage.shinooUsed >= 2
    if ((x2Done || x2Exhausted) && (shinooDone || shinooExhausted)) return null
    return (
      <div className="flex gap-2 justify-center px-4 pb-3 pt-1 border-t border-dark-border/40" dir="ltr">
        {!x2Exhausted && (
          x2Done ? (
            <div className="h-14 w-14 rounded-xl bg-green-500/20 border border-green-500 flex items-center justify-center">
              <img src="/x2.png" alt="X2" className="w-12 h-12 object-contain" />
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (inWindow && !shinooDone) powerup.onX2() }}
              className={`h-14 w-14 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${!inWindow || shinooDone ? 'border-gray-700 cursor-default' : 'border-transparent cursor-pointer'}`}
            >
              <img src="/x2.png" alt="X2" className={`w-12 h-12 object-contain ${!inWindow || shinooDone ? 'grayscale opacity-30' : ''}`} />
            </button>
          )
        )}
        {!shinooExhausted && (
          shinooDone ? (
            <div className="h-14 w-14 rounded-xl bg-green-500/20 border border-green-500 flex items-center justify-center">
              <img src="/logo.png" alt="SHINOO" className="w-12 h-12 object-contain" style={{ mixBlendMode: 'lighten' }} />
            </div>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (inWindow && !x2Done) powerup.onShinoo() }}
              className={`h-14 w-14 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${!inWindow || x2Done ? 'border-gray-700 cursor-default' : 'border-transparent cursor-pointer'}`}
            >
              <img src="/logo.png" alt="SHINOO" className={`w-12 h-12 object-contain ${!inWindow || x2Done ? 'grayscale opacity-30' : ''}`} style={{ mixBlendMode: 'lighten' }} />
            </button>
          )
        )}
      </div>
    )
  })()

  const outerClass = 'bg-dark-card border border-dark-border rounded-2xl hover:border-primary/30 transition-all duration-200 overflow-hidden'

  if (onPredictClick) {
    return (
      <div className={outerClass}>
        <button className="block w-full text-right active:scale-[0.98]" onClick={onPredictClick}>
          {cardContent}
        </button>
        {powerupRow}
      </div>
    )
  }

  return (
    <div className={outerClass}>
      <Link href={matchUrl} className="block active:scale-[0.98]">
        {cardContent}
      </Link>
      {powerupRow}
    </div>
  )
}
