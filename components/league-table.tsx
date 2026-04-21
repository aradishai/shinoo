'use client'

interface StandingsEntry {
  rank: number
  userId: string
  username: string
  totalPoints: number
  predictionCount: number
  wrong: number
  outcomeOnly: number
  outcomeAndOne: number
  exactScores: number
  role?: string
  correctPredictions?: number
}

interface LeagueTableProps {
  standings: StandingsEntry[]
  currentUserId?: string
}

function RankIndicator({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center flex-shrink-0">
      <span className="text-secondary font-black text-sm">1</span>
    </div>
  )
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full bg-gray-400/20 border border-gray-400/40 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-300 font-black text-sm">2</span>
    </div>
  )
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
      <span className="text-orange-400 font-black text-sm">3</span>
    </div>
  )
  return (
    <div className="w-8 h-8 rounded-full bg-dark-muted flex items-center justify-center flex-shrink-0">
      <span className="text-gray-500 font-bold text-sm">{rank}</span>
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`font-black text-sm ${color}`}>{value}</span>
      <span className="text-gray-600 text-xs leading-tight text-center">{label}</span>
    </div>
  )
}

export function LeagueTable({ standings, currentUserId }: LeagueTableProps) {
  if (standings.length === 0) {
    return <div className="text-center py-8 text-gray-500">אין נקודות עדיין — התחל לנחש!</div>
  }

  return (
    <div className="space-y-2">
      {standings.map((entry) => {
        const isCurrentUser = entry.userId === currentUserId

        return (
          <div
            key={entry.userId}
            className={`p-3 rounded-xl transition-colors ${
              isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'bg-dark-card border border-dark-border'
            }`}
          >
            {/* Top row: rank + name + points */}
            <div className="flex items-center gap-3 mb-2">
              <RankIndicator rank={entry.rank} />
              <div className="flex-1 text-right">
                <span className={`font-bold ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
                  {entry.username}
                  {isCurrentUser && <span className="text-xs text-gray-500 font-normal mr-1">(אני)</span>}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-xl font-black ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
                  {entry.totalPoints}
                </div>
                <div className="text-xs text-gray-500">נק׳</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between px-1 pt-2 border-t border-dark-border">
              <Stat value={entry.predictionCount} label="משחקים" color="text-gray-400" />
              <Stat value={entry.wrong} label="טעות" color="text-red-500" />
              <Stat value={entry.outcomeOnly} label="מגמה" color="text-yellow-400" />
              <Stat value={entry.outcomeAndOne} label="מגמה+1" color="text-blue-400" />
              <Stat value={entry.exactScores} label="בול" color="text-secondary" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
