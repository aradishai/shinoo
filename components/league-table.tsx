'use client'

interface StandingsEntry {
  rank: number
  userId: string
  username: string
  totalPoints: number
  correctPredictions: number
  exactScores: number
  role?: string
  predictionCount?: number
}

interface LeagueTableProps {
  standings: StandingsEntry[]
  currentUserId?: string
}

function RankIndicator({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center">
        <span className="text-secondary font-black text-sm">1</span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-400/20 border border-gray-400/40 flex items-center justify-center">
        <span className="text-gray-300 font-black text-sm">2</span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
        <span className="text-orange-400 font-black text-sm">3</span>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-dark-muted flex items-center justify-center">
      <span className="text-gray-500 font-bold text-sm">{rank}</span>
    </div>
  )
}

export function LeagueTable({ standings, currentUserId }: LeagueTableProps) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        אין נקודות עדיין — התחל לנחש!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {standings.map((entry) => {
        const isCurrentUser = entry.userId === currentUserId

        return (
          <div
            key={entry.userId}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              isCurrentUser
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-dark-card border border-dark-border'
            }`}
          >
            {/* Rank */}
            <RankIndicator rank={entry.rank} />

            {/* Username */}
            <div className="flex-1 text-right">
              <span
                className={`font-bold ${
                  isCurrentUser ? 'text-primary' : 'text-white'
                }`}
              >
                {entry.username}
                {isCurrentUser && (
                  <span className="text-xs text-gray-500 font-normal mr-1">(אני)</span>
                )}
              </span>
              <div className="flex items-center justify-end gap-3 mt-0.5">
                <span className="text-xs text-gray-500">
                  {entry.correctPredictions} ניחושים נכונים
                </span>
                {entry.exactScores > 0 && (
                  <span className="text-xs text-secondary">
                    {entry.exactScores} מדויקים
                  </span>
                )}
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <div
                className={`text-xl font-black ${
                  isCurrentUser ? 'text-primary' : 'text-white'
                }`}
              >
                {entry.totalPoints}
              </div>
              <div className="text-xs text-gray-500">נקודות</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
