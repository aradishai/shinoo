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
    round?: string | null
  }
  prediction?: Prediction | null
  leagueId?: string
  onPredictClick?: () => void
}

// FIFA code → ISO 3166-1 alpha-2 (for flagcdn.com)
const FIFA_TO_ISO: Record<string, string> = {
  USA: 'us', MEX: 'mx', CAN: 'ca', PAN: 'pa', HON: 'hn', CRC: 'cr', SLV: 'sv',
  ARG: 'ar', BRA: 'br', COL: 'co', ECU: 'ec', URU: 'uy', VEN: 've', CHI: 'cl',
  PAR: 'py', PER: 'pe', BOL: 'bo',
  FRA: 'fr', ENG: 'gb-eng', ESP: 'es', GER: 'de', POR: 'pt', NED: 'nl',
  BEL: 'be', ITA: 'it', CRO: 'hr', SUI: 'ch', DEN: 'dk', AUT: 'at',
  TUR: 'tr', SRB: 'rs', SCO: 'gb-sct', UKR: 'ua', POL: 'pl', SVK: 'sk',
  HUN: 'hu', GRE: 'gr', ALB: 'al', CZE: 'cz', BIH: 'ba', WAL: 'gb-wls',
  JPN: 'jp', KOR: 'kr', IRN: 'ir', AUS: 'au', SAU: 'sa', QAT: 'qa',
  UZB: 'uz', IRQ: 'iq', CHN: 'cn', IND: 'in', THA: 'th',
  MAR: 'ma', SEN: 'sn', EGY: 'eg', CMR: 'cm', NGA: 'ng', TUN: 'tn',
  RSA: 'za', GHA: 'gh', CIV: 'ci', MLI: 'ml', COD: 'cd',
  NZL: 'nz', IDN: 'id',
  // WC2026 specific
  HAI: 'ht', SCO: 'gb-sct', PAR: 'py', CUW: 'cw', SWE: 'se',
  CPV: 'cv', NOR: 'no', ALG: 'dz', JOR: 'jo', COD: 'cd', COL: 'co',
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

export function MatchCard({ match, prediction, leagueId, onPredictClick }: MatchCardProps) {
  const kickoff = new Date(match.kickoffAt)
  const lockAt = new Date(match.lockAt)
  const status = match.status
  const isFinished = status === 'FINISHED'
  const isLive = status === 'LIVE'
  const isLocked = status === 'LOCKED' || status === 'LIVE'
  const isOpen = status === 'SCHEDULED' && new Date() < lockAt
  const badgeVariant = matchStatusToBadgeVariant(status)

  const matchUrl = leagueId
    ? `/matches/${match.id}?leagueId=${leagueId}`
    : `/matches/${match.id}`

  const cardContent = (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-green-sm transition-all duration-200 active:scale-[0.98]">
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
          {(isFinished || isLive) && match.homeScore !== null && match.awayScore !== null ? (
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                {match.homeScore}
              </span>
              <span className="text-gray-500 text-lg">-</span>
              <span className={`text-2xl font-black ${isLive ? 'text-primary' : 'text-white'}`}>
                {match.awayScore}
              </span>
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

      {/* Prediction Preview */}
      {prediction && (
        <div className="mt-3 pt-3 border-t border-dark-border flex items-center justify-between">
          <span className="text-xs text-gray-500">הניחוש שלי</span>
          <span className="text-sm font-bold text-primary">
            {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
          </span>
        </div>
      )}

      {/* CTA */}
      <div className="mt-3">
        {isOpen && !prediction && (
          <div className="bg-primary/10 border border-primary/30 text-primary text-center py-2 rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors">
            נחש עכשיו
          </div>
        )}
        {isOpen && prediction && (
          <div className="bg-dark-muted text-gray-300 text-center py-2 rounded-xl text-sm font-medium">
            ערוך ניחוש
          </div>
        )}
        {!isOpen && (
          <div className="text-gray-600 text-center py-2 text-sm">
            {prediction ? 'צפה בניחוש' : 'צפה במשחק'}
          </div>
        )}
      </div>
    </div>
  )

  if (onPredictClick) {
    return (
      <button className="block w-full text-right" onClick={onPredictClick}>
        {cardContent}
      </button>
    )
  }

  return (
    <Link href={matchUrl} className="block group">
      {cardContent}
    </Link>
  )
}
