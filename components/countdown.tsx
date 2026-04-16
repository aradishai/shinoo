'use client'

import { useState, useEffect } from 'react'

interface CountdownProps {
  targetDate: Date | string
  onExpire?: () => void
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime()
  const target = new Date(targetDate).getTime()
  const diff = target - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, expired: false }
}

export function Countdown({ targetDate, onExpire, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(new Date(targetDate))
  )

  useEffect(() => {
    if (timeLeft.expired) {
      onExpire?.()
      return
    }

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(new Date(targetDate))
      setTimeLeft(newTimeLeft)

      if (newTimeLeft.expired) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onExpire, timeLeft.expired])

  if (timeLeft.expired) {
    return (
      <span className={className || 'text-orange-400 text-xs font-medium'}>
        הזמן נגמר
      </span>
    )
  }

  if (timeLeft.days > 0) {
    return (
      <span className={className || 'text-gray-400 text-xs'} dir="ltr">
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    )
  }

  if (timeLeft.hours > 0) {
    return (
      <span className={className || 'text-yellow-400 text-xs font-medium'}>
        {timeLeft.hours}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    )
  }

  return (
    <span className={className || 'text-red-400 text-xs font-bold animate-pulse'}>
      {timeLeft.minutes}:{String(timeLeft.seconds).padStart(2, '0')}
    </span>
  )
}
