'use client'

import Link from 'next/link'

interface LeagueCardProps {
  league: {
    id: string
    name: string
    inviteCode: string
    memberCount: number
    userRank: number
    userPoints: number
    role?: string
  }
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-secondary text-lg">🥇</span>
  if (rank === 2) return <span className="text-gray-300 text-lg">🥈</span>
  if (rank === 3) return <span className="text-orange-500 text-lg">🥉</span>
  return <span className="text-gray-400 text-sm font-bold">#{rank}</span>
}

export function LeagueCard({ league }: LeagueCardProps) {
  return (
    <Link href={`/leagues/${league.id}`} className="block group">
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-green-sm transition-all duration-200 active:scale-[0.98]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {league.role === 'ADMIN' && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                מנהל
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-base text-right">{league.name}</h3>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-50 rounded-xl p-2.5 text-center">
            <div className="text-gray-500 text-xs mb-1">חברים</div>
            <div className="text-white font-bold text-lg">{league.memberCount}</div>
          </div>
          <div className="bg-dark-50 rounded-xl p-2.5 text-center">
            <div className="text-gray-500 text-xs mb-1">נקודות</div>
            <div className="text-primary font-bold text-lg">{league.userPoints}</div>
          </div>
          <div className="bg-dark-50 rounded-xl p-2.5 text-center">
            <div className="text-gray-500 text-xs mb-1">דירוג</div>
            <div className="flex justify-center items-center h-7">
              {league.userRank > 0 ? (
                <RankBadge rank={league.userRank} />
              ) : (
                <span className="text-gray-600 text-sm">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Invite code */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-mono bg-dark-muted px-2 py-1 rounded-lg">
            {league.inviteCode}
          </span>
          <span className="text-primary text-xs font-bold group-hover:underline">
            כנס לליגה ←
          </span>
        </div>
      </div>
    </Link>
  )
}
