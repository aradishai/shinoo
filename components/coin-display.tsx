'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CoinDisplay() {
  const [coins, setCoins] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.data?.coins !== undefined) setCoins(d.data.coins) })
  }, [])

  if (coins === null) return null

  return (
    <Link href="/shop" className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl">
      <span className="text-base">🪙</span>
      <span className="text-yellow-400 font-black text-sm">{coins}</span>
    </Link>
  )
}
