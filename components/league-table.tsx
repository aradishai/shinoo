'use client'

interface StandingsEntry {
  rank: number
  userId: string
  username: string
  totalPoints: number
  predictionCount: number
  wrong: number
  outcomeOnly: number
  drawInexact?: number
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
    <div className="w-7 h-7 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center flex-shrink-0">
      <span className="text-secondary font-black text-xs">1</span>
    </div>
  )
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-full bg-gray-400/20 border border-gray-400/40 flex items-center justify-center flex-shrink-0">
      <span className="text-gray-300 font-black text-xs">2</span>
    </div>
  )
  if (rank === 3) return (
    <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
      <span className="text-orange-400 font-black text-xs">3</span>
    </div>
  )
  return (
    <div className="w-7 h-7 rounded-full bg-dark-muted flex items-center justify-center flex-shrink-0">
      <span className="text-gray-500 font-bold text-xs">{rank}</span>
    </div>
  )
}

export function LeagueTable({ standings, currentUserId }: LeagueTableProps) {
  if (standings.length === 0) {
    return <div className="text-center py-8 text-gray-500">אין נקודות עדיין — התחל לנחש!</div>
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-2 py-2 gap-1 border-b border-dark-border">
        <div className="w-7 flex-shrink-0" />
        <div className="flex-1 min-w-0" />
        <div className="grid grid-cols-6 text-center" style={{ width: '54%' }}>
          <span className="text-[10px] text-gray-600">מש׳</span>
          <span className="text-[10px] text-red-500">✗</span>
          <span className="text-[10px] text-yellow-400">1+</span>
          <span className="text-[10px] text-orange-400">2+</span>
          <span className="text-[10px] text-blue-400">3+</span>
          <span className="text-[10px] text-green-400">בול</span>
        </div>
        <div className="w-7 text-center">
          <span className="text-[10px] text-gray-600">נק׳</span>
        </div>
      </div>

      {/* Rows */}
      {standings.map((entry, i) => {
        const isCurrentUser = entry.userId === currentUserId
        return (
          <div
            key={entry.userId}
            className={`flex items-center px-2 py-2.5 gap-1 ${
              i < standings.length - 1 ? 'border-b border-dark-border/50' : ''
            } ${isCurrentUser ? 'bg-primary/10' : ''}`}
          >
            <RankIndicator rank={entry.rank} />
            <div className="flex-1 min-w-0 text-right">
              <span className={`font-bold text-sm truncate block ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
                {entry.username}
                {isCurrentUser && <span className="text-xs text-gray-500 font-normal mr-1">(אני)</span>}
              </span>
            </div>
            <div className="grid grid-cols-6 text-center" style={{ width: '54%' }}>
              <span className="text-xs font-bold text-gray-400">{entry.predictionCount}</span>
              <span className="text-xs font-bold text-red-500">{entry.wrong}</span>
              <span className="text-xs font-bold text-yellow-400">{entry.outcomeOnly}</span>
              <span className="text-xs font-bold text-orange-400">{entry.drawInexact ?? 0}</span>
              <span className="text-xs font-bold text-blue-400">{entry.outcomeAndOne}</span>
              <span className="text-xs font-bold text-green-400">{entry.exactScores}</span>
            </div>
            <div className={`w-7 text-center font-black text-base ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
              {entry.totalPoints}
            </div>
          </div>
        )
      })}
    </div>
  )
}
