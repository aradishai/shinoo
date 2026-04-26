'use client'

import { clsx } from 'clsx'

type BadgeVariant = 'open' | 'locked' | 'live' | 'finished' | 'cancelled' | 'postponed'

interface BadgeProps {
  variant: BadgeVariant
  className?: string
}

const VARIANT_CONFIG: Record<BadgeVariant, { label: string; classes: string }> = {
  open: {
    label: 'פתוח לניחוש',
    classes: 'bg-primary/20 text-primary border border-primary/40',
  },
  locked: {
    label: 'נעול',
    classes: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  },
  live: {
    label: 'בלייב',
    classes: 'bg-red-500/20 text-red-400 border border-red-500/40',
  },
  finished: {
    label: 'הסתיים',
    classes: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  },
  cancelled: {
    label: 'בוטל',
    classes: 'bg-gray-700/20 text-gray-500 border border-gray-700/40',
  },
  postponed: {
    label: 'נדחה',
    classes: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  },
}

export function Badge({ variant, className }: BadgeProps) {
  const config = VARIANT_CONFIG[variant]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.classes,
        className
      )}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      )}
      {config.label}
    </span>
  )
}

export function matchStatusToBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'SCHEDULED':
      return 'open'
    case 'LOCKED':
      return 'locked'
    case 'LIVE':
    case 'PAUSED':
      return 'live'
    case 'FINISHED':
      return 'finished'
    case 'CANCELLED':
      return 'cancelled'
    case 'POSTPONED':
      return 'postponed'
    default:
      return 'open'
  }
}
