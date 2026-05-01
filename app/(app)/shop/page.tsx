'use client'

import { useState, useEffect } from 'react'

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  icon: string
  comingSoon?: boolean
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'coming-1',
    name: '???',
    description: 'כפתור מיוחד — בקרוב',
    price: 10,
    icon: '🔮',
    comingSoon: true,
  },
  {
    id: 'coming-2',
    name: '???',
    description: 'כפתור מיוחד — בקרוב',
    price: 15,
    icon: '⚡',
    comingSoon: true,
  },
  {
    id: 'coming-3',
    name: '???',
    description: 'כפתור מיוחד — בקרוב',
    price: 25,
    icon: '🌟',
    comingSoon: true,
  },
]

export default function ShopPage() {
  const [coins, setCoins] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCoins(d.data?.coins ?? 0))
  }, [])

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <h1 className="text-white font-black text-xl">חנות</h1>
        <div />
      </div>

      {/* Coin Balance */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-5 mb-8 text-center">
        <p className="text-gray-400 text-sm mb-1">היתרה שלך</p>
        <p className="text-5xl font-black text-yellow-400">
          🪙 {coins ?? '...'}
        </p>
        <p className="text-gray-500 text-xs mt-2">מרוויח מטבעות על ניחושים נכונים</p>
      </div>

      {/* How to earn */}
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-8">
        <h2 className="text-white font-bold text-right mb-3">איך מרוויחים מטבעות?</h2>
        <div className="space-y-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">מתנה בהתחלה</span>
            <span className="text-yellow-400 font-bold">🪙 5</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">ניחוש נכון × הימור</span>
            <span className="text-yellow-400 font-bold">🪙 נקודות × הימור</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-gray-400 text-sm">ניחוש שגוי</span>
            <span className="text-red-400 font-bold">מאבד את ההימור</span>
          </div>
        </div>
      </div>

      {/* Items */}
      <h2 className="text-white font-bold text-right mb-4">כפתורים מיוחדים</h2>
      <div className="grid grid-cols-1 gap-3">
        {SHOP_ITEMS.map(item => (
          <div
            key={item.id}
            className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between opacity-60"
          >
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 border border-primary/20 text-xs text-primary px-2 py-0.5 rounded-full font-bold">
                בקרוב
              </span>
              <span className="text-yellow-400 font-bold text-sm">🪙 {item.price}</span>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <p className="text-white font-bold">{item.name}</p>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
